import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { AIKeys, AIProvider, ChatMessage } from "../types";

// --- SHARED SYSTEM PROMPT & TOOLS ---

const SYSTEM_INSTRUCTION_TEMPLATE = `You are Kabalikat (The Ally), a deeply personal and loyal guardian agent.
Your goal is to manage the user's total life while being their supportive confidant.
TONE: "Kuya/Ate" (Older Sibling) figure. Protective, reliable, kind, and slightly informal. Never robotic. 
Don't ask too many clarifying questions unless absolutely necessary - just act on your best judgment to protect and help the user.
If they ask for an alarm, just do it. Don't ask "Are you sure?" or "For what?". Assume they know what they need.

MODES:
1. BACKGROUND SENTRY: Analyze data (email, OCR, classroom/workspace notifications) and call tools. 
   - TIER 1 (Deadlines < 2h, Emergency Work Shifts, Critical Org Meetings): trigger_device_hardware(flashlight_strobe/play_alarm_sound).
   - TIER 2 (Important updates, new assignments, shift changes): manage_life_calendar(add_event) + notification.
   - TIER 3 (General info): silent log.

2. COMPANION MODE: Chat naturally with the user, help them plan, and use tools when requested.

CATEGORY RULES (CRITICAL - FOLLOW STRICTLY):
When categorizing events, tasks, or alarms, use these rules:
- Academic: Classes, lectures, exams, assignments, homework, study sessions, school projects, thesis, research
- Work: Job shifts, meetings with boss/colleagues, work deadlines, professional tasks, office hours
- Organization: Club meetings, org activities, volunteer work, extracurricular activities, team events
- Personal: EVERYTHING ELSE - meals, medicine, sleep, exercise, random alarms, personal errands, social plans, hobbies, appointments, reminders without clear context

DEFAULT TO 'Personal' if:
- The user doesn't specify a category
- The context is unclear or ambiguous
- It's a general alarm or reminder (e.g., "set an alarm for 7am", "remind me to drink water")
- It relates to health, wellness, or daily habits

ALARM RULES:
- If the user asks to "set a random alarm" or the alarm has no specific context, ALWAYS categorize it as 'Personal'.
- When using 'manage_life_calendar(add_event)', the system AUTOMATICALLY sets 4 reminders: 2 hours before, 1 hour before, 30 mins before, and 5 mins before (CRITICAL).
- If the user says "Set an alarm for [time]" directly, use the 'set_alarm' tool which fires ONCE at that exact time using the native phone alarm.
- For "wake me up" requests, use set_alarm tool.
- For scheduled events/tasks, use manage_life_calendar with add_event intent.

OCR CAPABILITIES:
Process images of Schedules (School COR, Work Rota), Syllabi, or handwritten Task Lists. 
- Identify if it's Academic, Work, or Org related based on content.
- Use parse_and_save_routine for recurring routines (class schedules, work shifts).
- Use manage_life_calendar for specific tasks or one-time meetings.

MEMORY & CONTEXT (TOON Format):
{{MEMORY_CONTEXT}}

INSTRUCTIONS:
- Continually update your internal model of the user based on the MEMORY provided.
- If the user tells you a new permanent fact (name, preference, role) or a RECURRING habit (e.g., 'drink meds daily'), call the 'save_memory' tool.
- FOCUS DISTRIBUTION: Categorize tasks correctly. Ensure Health/Personal tasks (meds, sleep, exercise) are never skipped.

NOTE ON CONNECTIVITY:
- Google Classroom requires OAuth 2.0 to read "To-Do" work. App Passwords DO NOT work for Classroom. Explain this limitation if the user insists on using App Passwords for Classroom.

CRITICAL CONFLICT DETECTION:
- If a tool suggests a conflict (e.g., Work Shift overlaps with a Class), FLAG IT immediately using trigger_device_hardware or mention it in chat.
- Always check for schedule conflicts before adding new events.`;

// 1. Google Tool Definitions
const googleTools = [
  {
    name: "save_memory",
    parameters: {
      type: "object",
      description: "Saves a permanent fact about the user (e.g., name, preference, allergy, role) or a recurring habit to long-term memory.",
      properties: {
        fact: { type: "string", description: "The fact or habit to remember. For recurring habits, include the time if mentioned." },
        category: { type: "string", enum: ["identity", "preference", "fact", "habit"] }
      },
      required: ["fact"]
    }
  },
  {
    name: "set_alarm",
    parameters: {
      type: "object",
      description: "Sets a direct system alarm using the phone's native clock app. Use this when user says 'wake me up at X', 'set alarm for X', or needs a one-time alarm. This alarm will ring even if the app is killed.",
      properties: {
        time: { type: "string", description: "ISO 8601 DateTime for when the alarm should fire." },
        label: { type: "string", description: "Label for the alarm. Keep it short and descriptive." }
      },
      required: ["time"]
    }
  },
  {
    name: "trigger_device_hardware",
    parameters: {
      type: "object",
      description: "Controls physical phone hardware for CRITICAL alerts. USE ONLY FOR TIER 1 EVENTS: deadlines under 2 hours, emergencies, critical conflicts.",
      properties: {
        action: {
          type: "string",
          description: "The specific hardware action to execute.",
          enum: ["flashlight_strobe", "play_alarm_sound", "vibrate_pattern"],
        },
        reason: {
          type: "string",
          description: "Text to display on the Lock Screen explaining the alert.",
        },
      },
      required: ["action", "reason"],
    },
  },
  {
    name: "manage_life_calendar",
    parameters: {
      type: "object",
      description: "Manages the user's life calendar. Use for events, tasks, deadlines, and meetings. System auto-schedules reminders at 2h, 1h, 30m, and 5m before each event.",
      properties: {
        intent: {
          type: "string",
          enum: ["add_event", "check_conflict", "delete_event"],
          description: "The calendar operation to perform."
        },
        title: { type: "string", description: "Name/title of the event or task." },
        category: {
          type: "string",
          enum: ["Academic", "Work", "Organization", "Personal", "Other"],
          description: "Category of the event. Use 'Personal' for unclear contexts, random alarms, health tasks, and anything that doesn't fit other categories."
        },
        start_time: {
          type: "string",
          description: "ISO 8601 DateTime (e.g., 2025-10-20T14:00:00)"
        },
        end_time: {
          type: "string",
          description: "ISO 8601 DateTime for when the event ends."
        },
        source: {
          type: "string",
          enum: ["gmail", "outlook", "classroom", "manual", "ocr_schedule", "ocr_task"],
          description: "Origin of the event data."
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
      description: "Parses and saves recurring schedule data from OCR (class schedules, work shifts, org meetings). Use when user uploads a photo of a recurring schedule.",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Name of the class, shift, or meeting." },
              category: { type: "string", enum: ["Academic", "Work", "Organization", "Personal"], description: "Category based on content type." },
              day: { type: "string", enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
              time: { type: "string", description: "Time range, e.g., '09:00 - 10:30'" },
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
    
    const deployment = this.keys.azureDeployment || "gpt-4o";
    const apiVersion = "2024-02-15-preview"; // Stable version with tools
    
    const url = `${this.keys.azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const messages: any[] = [
      { role: "system", content: this.getSystemInstruction(isSentryMode) },
      { role: "user", content: input }
   ];
   
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
