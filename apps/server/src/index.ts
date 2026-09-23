import { Elysia, t } from "elysia";
import { runAgentLoop } from "@loki/agent-sdk";
import { eventBus } from "@loki/events";
import type { AgentEvent } from "@loki/types";

const app = new Elysia()
  .get("/health", () => ({ status: "ok", service: "loki-server" }))

  // Create & Run Task Endpoint
  .post(
    "/api/v1/tasks",
    async ({ body, set }) => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const prompt = body.prompt;

      // Run harness asynchronously in background task loop
      runAgentLoop({
        taskId,
        prompt,
        model: body.model,
      }).catch((err) => {
        console.error(`Task ${taskId} failed:`, err);
      });

      set.status = 202;
      return {
        taskId,
        status: "accepted",
        message: "Loki task created and execution started.",
      };
    },
    {
      body: t.Object({
        prompt: t.String(),
        model: t.Optional(t.String()),
      }),
    }
  )

  // Stream Event Logs Endpoint (Server-Sent Events)
  .get("/api/v1/tasks/:id/stream", ({ params, set }) => {
    const taskId = params.id;
    set.headers["content-type"] = "text/event-stream";
    set.headers["cache-control"] = "no-cache";
    set.headers["connection"] = "keep-alive";

    return new ReadableStream({
      start(controller) {
        const handler = (event: AgentEvent) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
          if (event.type === "agent.completed" || event.type === "agent.failed") {
            eventBus.unsubscribeFromTask(taskId, handler);
            controller.close();
          }
        };

        eventBus.subscribeToTask(taskId, handler);
      },
    });
  })

  .listen(3000);

console.log(`🚀 Loki Control Plane Server listening at http://localhost:${app.server?.port}`);
