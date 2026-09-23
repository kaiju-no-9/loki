import { Sandbox } from "@e2b/code-interpreter";
import { inspectShellCommand } from "@loki/trust";
import type { SandboxConfig, CommandResult, FileEntry } from "@loki/types";
import type { ISandboxAdapter } from "./types";

export class E2BSandboxAdapter implements ISandboxAdapter {
  private activeSandboxes = new Map<string, Sandbox>();

  async init(config?: SandboxConfig): Promise<string> {
    const apiKey = config?.apiKey || process.env.E2B_API_KEY;
    if (!apiKey) {
      throw new Error("E2B_API_KEY environment variable is missing.");
    }

    const sandbox = await Sandbox.create({
      apiKey,
      template: config?.template || "base",
      metadata: config?.metadata,
    });

    this.activeSandboxes.set(sandbox.sandboxId, sandbox);
    return sandbox.sandboxId;
  }

  private getSandbox(sandboxId: string): Sandbox {
    const sb = this.activeSandboxes.get(sandboxId);
    if (!sb) {
      throw new Error(`Sandbox session ${sandboxId} not found or active.`);
    }
    return sb;
  }

  async executeCommand(
    sandboxId: string,
    command: string,
    workDir = "/home/user/repo",
    timeoutMs = 60000
  ): Promise<CommandResult> {
    const inspection = inspectShellCommand(command);
    if (!inspection.allowed) {
      return {
        stdout: "",
        stderr: inspection.reason || "Refused by secret policy.",
        exitCode: 1,
        error: inspection.reason,
      };
    }

    const sb = this.getSandbox(sandboxId);
    await sb.commands.run(`mkdir -p ${workDir}`);

    const execution = await sb.commands.run(command, {
      cwd: workDir,
      timeoutMs,
    });

    return {
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode ?? 0,
      error: execution.error ? execution.error.message : undefined,
    };
  }

  async readFile(sandboxId: string, path: string): Promise<string> {
    const sb = this.getSandbox(sandboxId);
    return await sb.files.read(path);
  }

  async writeFile(
    sandboxId: string,
    path: string,
    content: string
  ): Promise<void> {
    const sb = this.getSandbox(sandboxId);
    const parentDir = path.substring(0, path.lastIndexOf("/"));
    if (parentDir) {
      await sb.commands.run(`mkdir -p ${parentDir}`);
    }
    await sb.files.write(path, content);
  }

  async listDir(sandboxId: string, path: string): Promise<FileEntry[]> {
    const sb = this.getSandbox(sandboxId);
    const files = await sb.files.list(path);
    return files.map((f) => ({
      name: f.name,
      path: `${path}/${f.name}`,
      isDir: f.isDir,
    }));
  }

  async close(sandboxId: string): Promise<void> {
    const sb = this.activeSandboxes.get(sandboxId);
    if (sb) {
      await sb.kill();
      this.activeSandboxes.delete(sandboxId);
    }
  }
}

export const defaultSandboxAdapter = new E2BSandboxAdapter();
