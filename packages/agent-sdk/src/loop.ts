import OpenAI from "openai";
import { SpecParser, CodebaseIndexer } from "@loki/context-engine";
import { eventBus } from "@loki/events";
import { defaultSandboxAdapter } from "@loki/sandbox";
import { wrapUserRequest, wrapToolResult } from "@loki/trust";
import type { AgentEvent } from "@loki/types";
import { classifyIntent } from "./intent";
import { buildSystemPrompt } from "./prompt-builder";
import { TOOL_DECLARATIONS, executeAgentTool } from "./tools";
import type { HarnessOptions, HarnessResult, ChatMessage } from "./types";

const DEFAULT_MAX_STEPS = 40;

export async function runAgentLoop(
  options: HarnessOptions
): Promise<HarnessResult> {
  const emit = (eventPartial: Omit<AgentEvent, "id" | "taskId" | "sequence" | "timestamp">) => {
    const fullEvent: AgentEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId: options.taskId,
      sequence: Date.now(),
      timestamp: new Date().toISOString(),
      ...eventPartial,
    };
    if (options.onEvent) {
      options.onEvent(fullEvent);
    }
    eventBus.emitTaskEvent(fullEvent);
  };

  const intent = classifyIntent(options.prompt);
  if (!intent.needsSandbox) {
    emit({
      type: "agent.started",
      message: "Fast-path intent matched (no sandbox required)",
    });
    emit({
      type: "agent.output",
      message: intent.directResponse || "Greeting processed",
    });
    emit({
      type: "agent.completed",
      message: "Task completed via fast-path",
    });
    return {
      status: "completed",
      message: "Task completed via fast-path",
      output: intent.directResponse,
      agent: "loki",
    };
  }

  const model = options.model || "gpt-4o-mini";
  const apiKey = options.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const message = "OPENAI_API_KEY is required for Loki agent harness.";
    emit({ type: "agent.failed", message });
    return { status: "failed", message, agent: "loki" };
  }

  const openai = new OpenAI({ apiKey });
  const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
  const workDir = options.workDir || "/home/user/repo";

  let sandboxId = options.sandboxId;
  if (!sandboxId) {
    try {
      emit({ type: "agent.log", message: "Provisioning E2B cloud sandbox..." });
      sandboxId = await defaultSandboxAdapter.init();
      emit({
        type: "agent.log",
        message: `E2B Sandbox initialized (${sandboxId})`,
      });
    } catch (err: any) {
      const message = `Failed to provision E2B sandbox: ${err.message}`;
      emit({ type: "agent.failed", message });
      return { status: "failed", message, agent: "loki" };
    }
  }

  // Parse prompt via Context-Driven Development SpecParser
  const featureSpec = SpecParser.parsePrompt(options.prompt);
  const specMarkdown = SpecParser.formatSpecMarkdown(featureSpec);

  // Generate initial codebase index from sandbox workspace
  let codebaseContext = "";
  try {
    const entries = await defaultSandboxAdapter.listDir(sandboxId, workDir);
    const index = CodebaseIndexer.generateIndexFromEntries(workDir, entries);
    codebaseContext = index.summaryText;
  } catch {
    codebaseContext = "";
  }

  const systemPrompt = buildSystemPrompt({
    workDir,
    featureSpecMarkdown: specMarkdown,
    codebaseContext,
  });

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: wrapUserRequest(options.prompt) },
  ];

  emit({
    type: "agent.started",
    message: `Loki agent loop started with CDD (model=${model}, sandbox=${sandboxId})`,
  });

  let steps = 0;
  let finalSummary = "";

  try {
    while (steps < maxSteps) {
      const abortReason = options.getAbortReason?.();
      if (abortReason) {
        emit({ type: "agent.failed", message: abortReason });
        return { status: "failed", message: abortReason, agent: "loki" };
      }

      steps += 1;

      const completion = await openai.chat.completions.create({
        model,
        messages: messages as any,
        tools: TOOL_DECLARATIONS,
      });

      const responseMessage = completion.choices[0]?.message;
      if (!responseMessage) {
        continue;
      }

      if (responseMessage.content?.trim()) {
        emit({
          type: "agent.output",
          message: responseMessage.content.trim(),
          data: { step: steps },
        });
      }

      const toolCalls = responseMessage.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        messages.push({
          role: "assistant",
          content: responseMessage.content,
        });
        messages.push({
          role: "user",
          content:
            "Do not stop yet. Keep implementing with tools until placeholders are updated, then call finish.",
        });
        continue;
      }

      messages.push({
        role: "assistant",
        content: responseMessage.content,
        tool_calls: toolCalls,
      });

      let finished = false;
      for (const call of toolCalls) {
        emit({
          type: "agent.tool",
          message: `Executing ${call.function.name}`,
          data: { tool: call.function.name, args: call.function.arguments },
        });

        const result = await executeAgentTool(
          { sandboxId, workDir },
          call.function.name,
          call.function.arguments
        );

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: wrapToolResult(call.function.name, result.content),
        });

        if (result.done) {
          finalSummary = result.summary || "Task completed";
          finished = true;
          break;
        }
      }

      if (finished) {
        break;
      }
    }

    const outputMessage = finalSummary || "Task finished after max steps.";
    emit({
      type: "agent.completed",
      message: outputMessage,
      data: { steps },
    });

    return {
      status: "completed",
      message: outputMessage,
      output: outputMessage,
      agent: "loki",
    };
  } catch (error: any) {
    const message = error.message || "Loki agent loop encountered an error.";
    emit({ type: "agent.failed", message });
    return { status: "failed", message, agent: "loki" };
  }
}
