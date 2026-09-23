export const FORBIDDEN_SECRET_PATTERNS = [
  /echo\s+.*(?:\$OPENAI_API_KEY|\$ANTHROPIC_API_KEY|\$DATABASE_URL|\$E2B_API_KEY|\$GITHUB_TOKEN)/i,
  /curl\s+.*(?:\$OPENAI|\$ANTHROPIC|\$DATABASE|\$E2B|\$GITHUB|auth_token|bearer)/i,
  /cat\s+.*(?:\.env|\.aws\/credentials|id_rsa|id_ed25519)/i,
  /env\b|printenv\b/i,
];

export interface ShellInspectionResult {
  allowed: boolean;
  reason?: string;
}

export function inspectShellCommand(command: string): ShellInspectionResult {
  const trimmed = command.trim();
  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        allowed: false,
        reason: `Refused: Command matched security secret refusal policy (${pattern.source}).`,
      };
    }
  }
  return { allowed: true };
}
