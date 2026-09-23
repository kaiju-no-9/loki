import type { AgentEvent } from "@loki/types";

export interface HarnessOptions {
  taskId: string;
  prompt: string;
  model?: string;
  openaiApiKey?: string;
  maxSteps?: number;
  maxWaitMs?: number;
  workDir?: string;
  sandboxId?: string;
  onEvent?: (event: AgentEvent) => void;
  getAbortReason?: () => string | null;
}

export interface HarnessResult {
  status: "completed" | "failed";
  message: string;
  output?: string;
  agent: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}
