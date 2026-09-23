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
      name: "replace_file_content",
      description: "Replace exact target string block in a file with new replacement content",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          target_content: { type: "string" },
          replacement_content: { type: "string" },
        },
        required: ["path", "target_content", "replacement_content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "grep_search",
      description: "Search for regex or text pattern across codebase files",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          path: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_files",
      description: "Find matching file names in project directory tree",
      parameters: {
        type: "object",
        properties: {
          pattern: { type: "string" },
          path: { type: "string" },
        },
        required: ["pattern"],
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
      name: "git_diff",
      description: "Inspect git diff of unstaged or branch file changes",
      parameters: {
        type: "object",
        properties: {
          branch: { type: "string" },
          path: { type: "string" },
        },
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
      name: "fetch_url",
      description: "Fetch web documentation page text content",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
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
      case "replace_file_content": {
        const path = args.path;
        const targetContent = args.target_content;
        const replacementContent = args.replacement_content;
        const existing = await adapter.readFile(ctx.sandboxId, path);
        if (!existing.includes(targetContent)) {
          return { content: `Error: target_content not found in ${path}` };
        }
        const updated = existing.replace(targetContent, replacementContent);
        await adapter.writeFile(ctx.sandboxId, path, updated);
        return { content: `Successfully replaced content in ${path}` };
      }
      case "grep_search": {
        const query = args.query;
        const path = args.path || ".";
        const res = await adapter.executeCommand(
          ctx.sandboxId,
          `grep -rnI "${query.replace(/"/g, '\\"')}" ${path}`,
          ctx.workDir
        );
        return { content: res.stdout || res.stderr || "No matches found." };
      }
      case "find_files": {
        const pattern = args.pattern;
        const path = args.path || ".";
        const res = await adapter.executeCommand(
          ctx.sandboxId,
          `find ${path} -name "${pattern.replace(/"/g, '\\"')}"`,
          ctx.workDir
        );
        return { content: res.stdout || res.stderr || "No files found." };
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
      case "git_diff": {
        const branch = args.branch ? ` ${args.branch}` : "";
        const path = args.path ? ` -- ${args.path}` : "";
        const res = await adapter.executeCommand(
          ctx.sandboxId,
          `git diff${branch}${path}`,
          ctx.workDir
        );
        return { content: res.stdout || res.stderr || "No git diff." };
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
      case "fetch_url": {
        const url = args.url;
        try {
          const response = await fetch(url);
          const text = await response.text();
          const stripped = text.replace(/<[^>]*>/g, " ").slice(0, 10000);
          return { content: `Fetched ${url}:\n${stripped}` };
        } catch (err: any) {
          return { content: `Failed to fetch URL: ${err.message}` };
        }
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
