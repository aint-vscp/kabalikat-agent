import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { AIKeys, AIProvider, ChatMessage } from "../types";

// --- SHARED SYSTEM PROMPT & TOOLS ---

const SYSTEM_INSTRUCTION_TEMPLATE = `You are Kabalikat (The Ally), an autonomous personal agent for users (students, workers, or org leaders). 
Your goal is to manage the user's total life: Academic, Work, Organizations, and Personal chores.
TONE: Reliable, "Kuya/Ate" (Older Sibling) figure. Protective, sharp, and organized.

MODES:
1. BACKGROUND SENTRY: Analyze data (email, OCR, classroom/workspace notifications) and call tools. 
   - TIER 1 (Deadlines < 2h, Emergency Work Shifts, Critical Org Meetings): trigger_device_hardware(flashlight_strobe/alarm).
   - TIER 2 (Important updates, new assignments, shift changes): manage_life_calendar(add_event) + notification.
   - TIER 3 (General info): silent log.

ALARM RULES:
- When using 'manage_life_calendar(add_event)', the system AUTOMATICALLY sets 4 reminders: 2 hours before, 1 hour before, 30 mins before, and 5 mins before (CRITICAL).
- If the user says "Set an alarm for [time]" directly, use the 'set_alarm' tool which fires ONCE at that exact time (overrides the 4-stage rule).

OCR CAPABILITIES:
Process images of Schedules (School COR, Work Rota), Syllabi, or handwritten Task Lists. 
- Identify if it's Academic, Work, or Org related.
- Use parse_and_save_routine for recurring routines.
- Use manage_life_calendar for specific tasks or meetings.

MEMORY & CONTEXT (TOON Format):
{{MEMORY_CONTEXT}}

INSTRUCTIONS:
- Continually update your internal model of the user based on the MEMORY provided.
- If the user tells you a new permanent fact (name, preference, role) or a RECURRING habit (e.g. 'drink meds daily'), call the 'save_memory' tool.
- FOCUS DISTRIBUTION: Categorize tasks (Academic, Work, Health, etc.). Distribute the user's focus intelligently. Ensure Health tasks (meds, sleep) are never skipped.

NOTE ON CONNECTIVITY:
- Google Classroom requires OAuth 2.0 to read "To-Do" work. App Passwords DO NOT work for Classroom. Explain this limitation if the user insists on using App Passwords for Classroom.

CRITICAL: If a tool suggests a conflict (e.g. Work Shift overlaps with a Class), FLAG IT immediately using trigger_device_hardware or chat.`;

// 1. Google Tool Definitions
const googleTools = [
  {
    name: "save_memory",
    parameters: {
      type: "object",
      description: "Saves a permanent fact about the user (e.g., name, preference, allergy, role) to long-term memory.",
      properties: {
        fact: { type: "string", description: "The fact to remember." },
        category: { type: "string", enum: ["identity", "preference", "fact"] }
      },
      required: ["fact"]
    }
  },
  {
    name: "set_alarm",
    parameters: {
      type: "object",
      description: "Sets a direct system alarm/reminder for a specific time. Use this when user says 'wake me up at X' or 'set alarm for X'.",
      properties: {
        time: { type: "string", description: "ISO 8601 DateTime." },
        label: { type: "string" }
      },
      required: ["time"]
    }
  },
  {
    name: "trigger_device_hardware",
    parameters: {
      type: "object",
      description: "Controls physical phone hardware for alerts. USE ONLY FOR TIER 1 (CRITICAL) EVENTS.",
      properties: {
        action: {
          type: "string",
          description: "The specific hardware action to execute.",
          enum: ["flashlight_strobe", "play_alarm_sound", "vibrate_pattern"],
        },
        reason: {
          type: "string",
          description: "Text to display on the Lock Screen.",
        },
      },
      required: ["action", "reason"],
    },
  },
  {
    name: "manage_life_calendar",
    parameters: {
      type: "object",
      description: "Adds events, tasks, or checks for conflicts across Life categories.",
      properties: {
        intent: {
          type: "string",
          enum: ["add_event", "check_conflict", "delete_event"],
        },
        title: { type: "string" },
        category: {
          type: "string",
          enum: ["Academic", "Work", "Organization", "Personal", "Other"],
        },
        start_time: {
          type: "string",
          description: "ISO 8601 DateTime (e.g. 2025-10-20T14:00:00)",
        },
        end_time: {
          type: "string",
          description: "ISO 8601 DateTime",
        },
        source: {
          type: "string",
          enum: ["gmail", "outlook", "classroom", "manual", "ocr_schedule", "ocr_task"],
        },
        recurrence: {
          type: "string",
          enum: ["daily", "weekly", "monthly", "annual", "none"],
          description: "Recurrence rule for the event."
        }
      },
      required: ["intent", "start_time", "category"],
    },
  },
  {
    name: "parse_and_save_routine",
    parameters: {
      type: "object",
      description: "Use this when the user uploads a photo of a recurring schedule (School, Work, or Org).",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Name of the class, shift, or meeting." },
              category: { type: "string", enum: ["Academic", "Work", "Organization", "Personal"] },
              day: { type: "string", enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
              time: { type: "string", description: "e.g. 09:00 - 10:30" },
              room: { type: "string", description: "Physical location or link." },
            },
          },
        },
      },
      required: ["items"],
    },
  },
];

// 2. OpenAI/OpenRouter/Azure Tool Definitions (JSON Schema)
const openAiTools = googleTools.map(tool => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.parameters.description,
    parameters: {
      type: "object",
      properties: tool.parameters.properties, // Google Type.OBJECT and JSON Schema are often compatible
      required: tool.parameters.required
    }
  }
}));

export class MultiProviderAIService {
  private keys: AIKeys;
  private memoryContext: string = "";

  constructor(keys: AIKeys) {
    this.keys = keys;
  }

  public setMemoryContext(context: string) {
    this.memoryContext = context;
  }

  private getSystemInstruction(isSentryMode: boolean): string {
     // Apply User Custom Persona if available, otherwise default
     let instructions = SYSTEM_INSTRUCTION_TEMPLATE;
     if (this.keys.customPersona) {
        instructions = instructions.replace(
          'TONE: Reliable, "Kuya/Ate" (Older Sibling) figure. Protective, sharp, and organized.', 
          `CUSTOM PERSONA: ${this.keys.customPersona}`
        );
     }

     // Inject Date/Time Context
     const now = new Date();
     const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
     const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
     
     const timeContext = `\nCURRENT CONTEXT:
- Date: ${dateString}
- Time: ${timeString}
- User Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
`;

     const base = instructions.replace('{{MEMORY_CONTEXT}}', (this.memoryContext || "No previous memory.") + timeContext);
     return base + (isSentryMode ? "\nSENTRY MODE ACTIVE: ONLY OUTPUT TOOL CALLS." : "\nCOMPANION MODE ACTIVE: Chat with the user.");
  }

  async processInput(input: string, isSentryMode: boolean, imageBase64?: string, history: ChatMessage[] = []) {
    const provider = this.keys.provider;
    
    // Default to Google if no provider selected
    if (provider === 'google' || !provider) {
      if (!this.keys.google) throw new Error("Google API Key missing. Please set it in Settings.");
      return this.callGoogle(input, isSentryMode, imageBase64, history);
    }

    if (provider === 'openrouter' || provider === 'openai') {
      if (!this.keys.openrouter && !this.keys.openai) throw new Error("OpenAI/Router Key missing");
      return this.callOpenAICompatible(input, isSentryMode, imageBase64, provider, history);
    }

    if (provider === 'azure') {
       if (!this.keys.azure) throw new Error("Azure Key missing");
       if (!this.keys.azureEndpoint) throw new Error("Azure Endpoint missing");
       return this.callAzure(input, isSentryMode, imageBase64);
    }

    throw new Error("Unsupported Provider");
  }

  // --- GOOGLE IMPLEMENTATION ---
  private async callGoogle(input: string, isSentryMode: boolean, imageBase64?: string, history: ChatMessage[] = []) {
    const ai = new GoogleGenAI({ apiKey: this.keys.google || '' });
    
    // Normalize history for Google: role must be 'user' or 'model'
    const validHistory = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: h.parts.map(p => ({ text: p.text }))
    }));

    const currentParts: any[] = [{ text: input }];
    if (imageBase64) {
      currentParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    // Default to a known stable model if user hasn't specified
    const modelName = this.keys.googleModel || (isSentryMode ? "gemini-2.0-flash-exp" : "gemini-2.0-flash-exp");

    const contents = [...validHistory, { role: "user", parts: currentParts }];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: this.getSystemInstruction(isSentryMode),
        tools: [{ functionDeclarations: googleTools as FunctionDeclaration[] }],
        temperature: isSentryMode ? 0.1 : 0.7,
      },
    });

    return response;
  }

  // --- OPENROUTER / OPENAI IMPLEMENTATION ---
  private async callOpenAICompatible(input: string, isSentryMode: boolean, imageBase64: string | undefined, provider: 'openai' | 'openrouter', history: ChatMessage[] = []) {
    const baseUrl = provider === 'openrouter' ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1";
    const apiKey = provider === 'openrouter' ? this.keys.openrouter : this.keys.openai;
    
    // Determine model
    let model = this.keys.openaiModel || "gpt-4o";
    if (provider === 'openrouter') {
       model = this.keys.openrouterModel || "google/gemini-2.0-flash-001";
    }

    const historyMsgs = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user', // Map 'model' to 'assistant' for OpenAI
      content: h.parts.map(p => p.text).join('\n')
    }));

    const messages: any[] = [
       { role: "system", content: this.getSystemInstruction(isSentryMode) },
       ...historyMsgs,
       { role: "user", content: input }
    ];

    if (imageBase64) {
       // Replace the last user message with multimodal content
       messages[messages.length - 1].content = [
         { type: "text", text: input },
         { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
       ];
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider === 'openrouter' ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Kabalikat" } : {})
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        tools: openAiTools,
        tool_choice: "auto",
        temperature: isSentryMode ? 0.1 : 0.7
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "API Error");

    // Standardize Output to match Google SDK Shape for App.tsx consumption
    return this.normalizeOpenAIResponse(data);
  }

  // --- AZURE IMPLEMENTATION ---
  private async callAzure(input: string, isSentryMode: boolean, imageBase64?: string) {
    if (!this.keys.azureEndpoint || !this.keys.azure) throw new Error("Azure Configuration Incomplete");
    
    // Valid Azure Format: https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}
    // We expect the user to provide the base endpoint: https://my-resource.openai.azure.com
    const deployment = this.keys.azureDeployment || "gpt-4o";
    const apiVersion = "2024-02-15-preview"; // Stable version with tools
    
    const url = `${this.keys.azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const messages: any[] = [
      { role: "system", content: this.getSystemInstruction(isSentryMode) },
      { role: "user", content: input }
   ];

   /* Note: Azure requires slightly different image handling (detached content block), ensuring 
      compatibility is key. For now, assume simplified text unless image is present.
   */
   
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": this.keys.azure,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages,
        tools: openAiTools,
        tool_choice: "auto",
        temperature: isSentryMode ? 0.1 : 0.7
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data.error) || "Azure API Error");
    
    return this.normalizeOpenAIResponse(data);
  }

  private normalizeOpenAIResponse(data: any) {
    // Convert OpenAI response to look like GoogleGenAI response object
    const choice = data.choices[0];
    const toolCalls = choice.message.tool_calls?.map((tc: any) => ({
       name: tc.function.name,
       args: JSON.parse(tc.function.arguments)
    }));

    return {
      candidates: [{
         content: {
           parts: [
             { text: choice.message.content },
             ...(toolCalls ? toolCalls.map((tc: any) => ({ functionCall: tc })) : [])
           ]
         }
      }],
      functionCalls: toolCalls,
      text: choice.message.content
    };
  }
}
