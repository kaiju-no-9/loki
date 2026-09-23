export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type SessionState = "active" | "hibernated" | "closed";

export interface AgentTask {
  id: string;
  userId?: string;
  prompt: string;
  agent: string;
  status: TaskStatus;
  title?: string;
  repository?: string;
  branch?: string;
  sessionActive: boolean;
  sandboxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSession {
  taskId: string;
  sandboxId: string;
  repoCwd: string;
  state: SessionState;
  lastActiveAt: Date;
  createdAt: Date;
}

export type AgentEventType =
  | "agent.started"
  | "agent.thought"
  | "agent.tool"
  | "agent.output"
  | "agent.log"
  | "agent.completed"
  | "agent.failed";

export interface AgentEvent {
  id: string;
  taskId: string;
  type: AgentEventType;
  message: string;
  data?: Record<string, unknown>;
  sequence: number;
  timestamp: string;
}

export interface ToolProgress {
  tool: string;
  detail: string;
  message: string;
}

export interface SandboxConfig {
  apiKey?: string;
  template?: string;
  timeoutMs?: number;
  metadata?: Record<string, string>;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}
