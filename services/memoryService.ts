// Memory Service using TOON for efficient context storage
import { encode, decode } from '@toon-format/toon';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';


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
  handled_recurrence_ids?: string[]; // IDs of recurrences already generated
  last_interaction?: string;
}

export class MemoryService {
  private memory: UserMemory;
  private readonly FILE_NAME = 'kabalikat_memory.toon';
  private initialized = false;

  constructor() {
    this.memory = { identity: { preferences: [] }, facts: [], recurring_tasks: [], handled_recurrence_ids: [] };
  }

  public async init() {
    if (this.initialized) return;
    this.memory = await this.load();
    this.initialized = true;
  }

  private async load(): Promise<UserMemory> {
    try {
      // Try to read from filesystem
      const result = await Filesystem.readFile({
        path: this.FILE_NAME,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      const raw = typeof result.data === 'string' ? result.data : String(result.data);
      if (!raw) return { identity: { preferences: [] }, facts: [], recurring_tasks: [], handled_recurrence_ids: [] };
      return decode(raw) as unknown as UserMemory;
    } catch (e) {
      console.log("No existing memory file found or error reading (created new).", e);
      return { identity: { preferences: [] }, facts: [], recurring_tasks: [], handled_recurrence_ids: [] };
    }
  }

  private async save() {
    try {
      const encoded = encode(this.memory);
      await Filesystem.writeFile({
        path: this.FILE_NAME,
        data: encoded,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    } catch (e) {
      console.error("Failed to write memory to filesystem", e);
    }
  }

  // --- Public API ---

  public getContextString(): string {
    // Return a TOON-formatted string to inject into the LLM System Prompt
    return encode(this.memory);
  }

  public async learn(text: string) {
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

    await this.save();
  }
  
  public async addFact(fact: string) {
    if (!this.memory.facts.includes(fact)) {
      this.memory.facts.push(fact);
      await this.save();
    }
  }

  public async addRecurringTask(task: RecurrentTask) {
      this.memory.recurring_tasks.push(task);
      await this.save();
  }

  public async markRecurrenceAsHandled(id: string) {
    if (!this.memory.handled_recurrence_ids) {
      this.memory.handled_recurrence_ids = [];
    }
    if (!this.memory.handled_recurrence_ids.includes(id)) {
      this.memory.handled_recurrence_ids.push(id);
      await this.save();
    }
  }

  public getMemory(): UserMemory {
    return this.memory;
  }
}
