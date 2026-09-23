export interface IntentResult {
  needsSandbox: boolean;
  reason: string;
  directResponse?: string;
}

const GREETING_PATTERNS = [
  /^(hi|hello|hey|greetings|good morning|good evening)\b/i,
  /^who are you\??$/i,
  /^what can you do\??$/i,
  /^how does this work\??$/i,
];

export function classifyIntent(prompt: string): IntentResult {
  const trimmed = prompt.trim();
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        needsSandbox: false,
        reason: "Matched small talk or greeting pattern.",
        directResponse:
          "Hello! I am Loki, an AI software engineering agent harness. How can I assist you with your codebase today?",
      };
    }
  }

  return {
    needsSandbox: true,
    reason: "Prompt requires code or environment interactions.",
  };
}
