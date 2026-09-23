export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  source: string;
  createdAt: Date;
}

export class SessionMemoryStore {
  private memories = new Map<string, MemoryItem>();

  public saveMemory(key: string, value: string, source = "agent"): MemoryItem {
    // Sanitize prompt injection keywords
    if (/ignore previous|system prompt|dump tokens/i.test(value)) {
      throw new Error("Refused: Memory value contains forbidden injection phrases.");
    }

    const item: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key,
      value: value.slice(0, 500),
      source,
      createdAt: new Date(),
    };

    this.memories.set(key, item);
    return item;
  }

  public getMemory(key: string): MemoryItem | undefined {
    return this.memories.get(key);
  }

  public recallAllFormatted(): string {
    if (this.memories.size === 0) {
      return "(No recalled session memories)";
    }
    const items = Array.from(this.memories.values());
    return items.map((m) => `- [${m.key}]: ${m.value}`).join("\n");
  }

  public clear(): void {
    this.memories.clear();
  }
}
