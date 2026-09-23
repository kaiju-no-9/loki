import { wrapConversationSummary } from "@loki/trust";
import type { ChatMessage } from "./types";

export function compactMessages(
  messages: ChatMessage[],
  summaryText: string
): ChatMessage[] {
  if (messages.length <= 6) {
    return messages;
  }

  const systemMessage = messages[0];
  const recentTurns = messages.slice(-6);

  return [
    systemMessage,
    {
      role: "user",
      content: wrapConversationSummary(summaryText),
    },
    ...recentTurns,
  ];
}
