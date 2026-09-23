import type { SandboxConfig, CommandResult, FileEntry } from "@loki/types";

export interface ISandboxAdapter {
  init(config?: SandboxConfig): Promise<string>;
  executeCommand(
    sandboxId: string,
    command: string,
    workDir?: string,
    timeoutMs?: number
  ): Promise<CommandResult>;
  readFile(sandboxId: string, path: string): Promise<string>;
  writeFile(sandboxId: string, path: string, content: string): Promise<void>;
  listDir(sandboxId: string, path: string): Promise<FileEntry[]>;
  close(sandboxId: string): Promise<void>;
}
