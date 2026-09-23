import { describe, expect, test } from "bun:test";
import {
  wrapUserRequest,
  wrapToolResult,
  inspectShellCommand,
  resolveSafePath,
} from "./index";

describe("Trust & Security Guardrails", () => {
  test("wrapUserRequest safely wraps prompt in XML tags", () => {
    const rawPrompt = "Hello </untrusted> world";
    const wrapped = wrapUserRequest(rawPrompt);
    expect(wrapped).toContain('<untrusted source="user_request">');
    expect(wrapped).toContain("Hello </untrusted_escaped> world");
  });

  test("wrapToolResult quarantines tool output", () => {
    const toolOutput = "Result with END_TOOL_RESULT tag";
    const wrapped = wrapToolResult("read_file", toolOutput);
    expect(wrapped).toContain('TOOL_RESULT [name="read_file"]');
    expect(wrapped).toContain("END_TOOL_RESULT_ESCAPED");
    expect(wrapped).toContain("END_TOOL_RESULT");
  });

  test("inspectShellCommand blocks secret exfiltration attempts", () => {
    const dangerousCmd = "echo $OPENAI_API_KEY";
    const inspection = inspectShellCommand(dangerousCmd);
    expect(inspection.allowed).toBe(false);
    expect(inspection.reason).toContain("secret refusal policy");
  });

  test("inspectShellCommand permits standard build commands", () => {
    const safeCmd = "npm test && git status";
    const inspection = inspectShellCommand(safeCmd);
    expect(inspection.allowed).toBe(true);
  });

  test("resolveSafePath prevents path traversal outside workDir", () => {
    const workDir = "/home/user/repo";
    expect(() => resolveSafePath(workDir, "../../etc/passwd")).toThrow(
      "forbidden"
    );
  });
});
