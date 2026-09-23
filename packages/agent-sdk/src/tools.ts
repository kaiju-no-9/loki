import { defaultSandboxAdapter, type ISandboxAdapter } from "@loki/sandbox";
import { wrapToolResult } from "@loki/trust";

export const TOOL_DECLARATIONS = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read contents of a file relative to working directory",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Create or overwrite a file with exact code content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_dir",
      description: "List files and subdirectories in a directory path",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "shell",
      description: "Execute a non-blocking bash command inside E2B sandbox",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
          timeout_ms: { type: "number" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_commit",
      description: "Stage all changes and commit with a clear message",
      parameters: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "finish",
      description: "Complete the agent task and provide a final summary",
      parameters: {
        type: "object",
        properties: { summary: { type: "string" } },
        required: ["summary"],
      },
    },
  },
];

export interface ExecuteToolContext {
  sandboxId: string;
  workDir: string;
  adapter?: ISandboxAdapter;
}

export async function executeAgentTool(
  ctx: ExecuteToolContext,
  name: string,
  rawArgs: string
): Promise<{ content: string; done?: boolean; summary?: string }> {
  const adapter = ctx.adapter || defaultSandboxAdapter;
  let args: Record<string, any> = {};
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    args = {};
  }

  try {
    switch (name) {
      case "read_file": {
        const path = args.path || ".";
        const content = await adapter.readFile(ctx.sandboxId, path);
        return { content };
      }
      case "write_file": {
        const path = args.path;
        const content = args.content || "";
        await adapter.writeFile(ctx.sandboxId, path, content);
        return { content: `Successfully wrote ${content.length} bytes to ${path}` };
      }
      case "list_dir": {
        const path = args.path || ctx.workDir;
        const entries = await adapter.listDir(ctx.sandboxId, path);
        const formatted = entries
          .map((e) => `${e.isDir ? "[DIR]" : "[FILE]"} ${e.name}`)
          .join("\n");
        return { content: formatted || "(empty directory)" };
      }
      case "shell": {
        const command = args.command;
        const timeoutMs = args.timeout_ms || 60000;
        const res = await adapter.executeCommand(
          ctx.sandboxId,
          command,
          ctx.workDir,
          timeoutMs
        );
        const output = res.error
          ? `Error: ${res.error}\nStderr: ${res.stderr}`
          : res.stdout || res.stderr || "(Command executed with no output)";
        return { content: output };
      }
      case "git_commit": {
        const message = args.message || "update";
        const res = await adapter.executeCommand(
          ctx.sandboxId,
          `git add . && git commit -m "${message.replace(/"/g, '\\"')}"`,
          ctx.workDir
        );
        return { content: res.stdout || res.stderr };
      }
      case "finish": {
        const summary = args.summary || "Task completed";
        return { content: `Task finished: ${summary}`, done: true, summary };
      }
      default:
        return { content: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { content: `tool error: ${err.message || String(err)}` };
  }
}
