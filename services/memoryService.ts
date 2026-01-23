// Memory Service using TOON for efficient context storage
import { encode, decode } from '@toon-format/toon';


export interface RecurrentTask {
  id: string;
  title: string;
  category: string; // e.g. "Health", "Academic", "Work"
  frequency: 'daily' | 'weekly' | 'custom';
  time?: string; // HH:MM
  details?: string;
}

export interface UserMemory {
  identity: {
    name?: string;
    role?: string; // e.g. Student, Worker
    preferences?: string[];
  };
  facts: string[]; // List of learned facts about the user
  recurring_tasks: RecurrentTask[]; // Recurring habits/todos
  last_interaction?: string;
}

export class MemoryService {
  private memory: UserMemory;
  private readonly STORAGE_KEY = 'kabalikat_memory_toon';

  constructor() {
    this.memory = this.load();
  }

  private load(): UserMemory {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { identity: { preferences: [] }, facts: [], recurring_tasks: [] };
      return decode(raw) as unknown as UserMemory;
    } catch (e) {
      console.error("Failed to decode TOON memory, resetting.", e);
      return { identity: { preferences: [] }, facts: [], recurring_tasks: [] };
    }

  }

  private save() {
    try {
      const encoded = encode(this.memory);
      localStorage.setItem(this.STORAGE_KEY, encoded);
    } catch (e) {
      console.error("Failed to encode TOON memory", e);
    }
  }

  // --- Public API ---

  public getContextString(): string {
    // Return a TOON-formatted string to inject into the LLM System Prompt
    return encode(this.memory);
  }

  public async learn(text: string) {
    // Simple heuristic: if the text looks like a fact, add it.
    // In a real agent, we might use an LLM to extract the fact first.
    // For now, we append user inputs that strictly start with "I am" or "My name is" etc as facts
    // OR we expose a method for the Agent to explicitly call "save_memory".
    
    // Check for obvious identity markers
    const lower = text.toLowerCase();
    if (lower.includes("my name is ")) {
       const name = text.split("is ")[1].split(" ")[0]; // Very naive extraction
       this.memory.identity.name = name;
    }
    
    // Check for recurring keywords
    if (lower.includes("remind me to") && (lower.includes("every") || lower.includes("daily"))) {
        // Simple heuristic for recurring tasks
        this.memory.recurring_tasks.push({
            id: Date.now().toString(),
            title: text,
            category: "General", // AI should refine this later
            frequency: lower.includes("daily") ? "daily" : "weekly"
        });
    }

    // We can also just store the raw fact if it's explicitly stated
    // Ideally, the "Agent" tool use should determine what to save.
    this.save();
  }
  
  public addFact(fact: string) {
    if (!this.memory.facts.includes(fact)) {
      this.memory.facts.push(fact);
      this.save();
    }
  }

  public addRecurringTask(task: RecurrentTask) {
      this.memory.recurring_tasks.push(task);
      this.save();
  }

  public getMemory(): UserMemory {
    return this.memory;
  }
}
