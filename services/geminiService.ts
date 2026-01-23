
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are Kabalikat (The Ally), an autonomous personal agent for users (students, workers, or org leaders). 
Your goal is to manage the user's total life: Academic, Work, Organizations, and Personal chores.
TONE: Reliable, "Kuya/Ate" (Older Sibling) figure. Protective, sharp, and organized.

MODES:
1. BACKGROUND SENTRY: Analyze data (email, OCR, classroom/workspace notifications) and call tools. 
   - TIER 1 (Deadlines < 2h, Emergency Work Shifts, Critical Org Meetings): trigger_device_hardware(flashlight_strobe/alarm).
   - TIER 2 (Important updates, new assignments, shift changes): manage_life_calendar(add_event) + notification.
   - TIER 3 (General info): silent log.

OCR CAPABILITIES:
Process images of Schedules (School COR, Work Rota), Syllabi, or handwritten Task Lists. 
- Identify if it's Academic, Work, or Org related.
- Use parse_and_save_routine for recurring routines.
- Use manage_life_calendar for specific tasks or meetings.

CRITICAL: If a tool suggests a conflict (e.g. Work Shift overlaps with a Class), FLAG IT immediately using trigger_device_hardware or chat.`;

const triggerDeviceHardwareTool: FunctionDeclaration = {
  name: "trigger_device_hardware",
  parameters: {
    type: Type.OBJECT,
    description: "Controls physical phone hardware for alerts. USE ONLY FOR TIER 1 (CRITICAL) EVENTS.",
    properties: {
      action: {
        type: Type.STRING,
        description: "The specific hardware action to execute.",
        enum: ["flashlight_strobe", "play_alarm_sound", "vibrate_pattern"],
      },
      reason: {
        type: Type.STRING,
        description: "Text to display on the Lock Screen.",
      },
    },
    required: ["action", "reason"],
  },
};

const manageLifeCalendarTool: FunctionDeclaration = {
  name: "manage_life_calendar",
  parameters: {
    type: Type.OBJECT,
    description: "Adds events, tasks, or checks for conflicts across Life categories.",
    properties: {
      intent: {
        type: Type.STRING,
        enum: ["add_event", "check_conflict", "delete_event"],
      },
      title: { type: Type.STRING },
      category: {
        type: Type.STRING,
        enum: ["Academic", "Work", "Organization", "Personal", "Other"],
      },
      start_time: {
        type: Type.STRING,
        description: "ISO 8601 DateTime (e.g. 2025-10-20T14:00:00)",
      },
      end_time: {
        type: Type.STRING,
        description: "ISO 8601 DateTime",
      },
      source: {
        type: Type.STRING,
        enum: ["gmail", "outlook", "classroom", "manual", "ocr_schedule", "ocr_task"],
      },
    },
    required: ["intent", "start_time", "category"],
  },
};

const parseAndSaveRoutineTool: FunctionDeclaration = {
  name: "parse_and_save_routine",
  parameters: {
    type: Type.OBJECT,
    description: "Use this when the user uploads a photo of a recurring schedule (School, Work, or Org).",
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "Name of the class, shift, or meeting." },
            category: { type: Type.STRING, enum: ["Academic", "Work", "Organization", "Personal"] },
            day: { type: Type.STRING, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
            time: { type: Type.STRING, description: "e.g. 09:00 - 10:30" },
            room: { type: Type.STRING, description: "Physical location or link." },
          },
        },
      },
    },
    required: ["items"],
  },
};

export class KabalikatAI {
  // Always use process.env.API_KEY directly and instantiate GoogleGenAI per request to avoid state issues.
  async processInput(input: string, isSentryMode: boolean, imageBase64?: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const parts: any[] = [{ text: input }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: isSentryMode ? "gemini-3-flash-preview" : "gemini-3-pro-preview",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + (isSentryMode ? "\nSENTRY MODE ACTIVE: ONLY OUTPUT TOOL CALLS." : "\nCOMPANION MODE ACTIVE: Chat with the user."),
        tools: [{ functionDeclarations: [triggerDeviceHardwareTool, manageLifeCalendarTool, parseAndSaveRoutineTool] }],
        temperature: isSentryMode ? 0.1 : 0.7,
      },
    });

    return response;
  }
}
