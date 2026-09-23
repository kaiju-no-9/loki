import { EventEmitter } from "node:events";
import type { AgentEvent } from "@loki/types";

export class TaskEventBus extends EventEmitter {
  private static instance: TaskEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): TaskEventBus {
    if (!TaskEventBus.instance) {
      TaskEventBus.instance = new TaskEventBus();
    }
    return TaskEventBus.instance;
  }

  public emitTaskEvent(event: AgentEvent): boolean {
    this.emit(`task:${event.taskId}`, event);
    return this.emit("global:event", event);
  }

  public subscribeToTask(
    taskId: string,
    handler: (event: AgentEvent) => void
  ): void {
    this.on(`task:${taskId}`, handler);
  }

  public unsubscribeFromTask(
    taskId: string,
    handler: (event: AgentEvent) => void
  ): void {
    this.off(`task:${taskId}`, handler);
  }
}

export const eventBus = TaskEventBus.getInstance();
