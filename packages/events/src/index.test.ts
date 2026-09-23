import { describe, expect, test } from "bun:test";
import { eventBus } from "./index";
import type { AgentEvent } from "@loki/types";

describe("TaskEventBus", () => {
  test("emits and receives typed task events", (done) => {
    const taskId = "task-test-123";
    const mockEvent: AgentEvent = {
      id: "evt-1",
      taskId,
      type: "agent.started",
      message: "Loop started",
      sequence: 1,
      timestamp: new Date().toISOString(),
    };

    eventBus.subscribeToTask(taskId, (event) => {
      expect(event.taskId).toBe(taskId);
      expect(event.type).toBe("agent.started");
      expect(event.message).toBe("Loop started");
      done();
    });

    eventBus.emitTaskEvent(mockEvent);
  });
});
