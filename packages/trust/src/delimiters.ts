export function wrapUserRequest(prompt: string): string {
  const sanitized = prompt.replace(/<\/untrusted>/g, "</untrusted_escaped>");
  return `<untrusted source="user_request">\n${sanitized}\n</untrusted>`;
}

export function wrapToolResult(toolName: string, output: string): string {
  const sanitized = (output || "")
    .replace(/END_TOOL_RESULT/g, "END_TOOL_RESULT_ESCAPED")
    .replace(/<\/untrusted>/g, "</untrusted_escaped>");
  return `TOOL_RESULT [name="${toolName}"]\n${sanitized}\nEND_TOOL_RESULT`;
}

export function wrapSessionContext(context: string): string {
  const sanitized = context.replace(/<\/untrusted>/g, "</untrusted_escaped>");
  return `<untrusted source="session_context">\n${sanitized}\n</untrusted>`;
}

export function wrapRecalledMemory(memory: string): string {
  const sanitized = memory.replace(/<\/untrusted>/g, "</untrusted_escaped>");
  return `<untrusted source="recalled_memory">\n${sanitized}\n</untrusted>`;
}

export function wrapRepoListing(listing: string): string {
  const sanitized = listing.replace(/<\/untrusted>/g, "</untrusted_escaped>");
  return `<untrusted source="repo_listing">\n${sanitized}\n</untrusted>`;
}

export function wrapConversationSummary(summary: string): string {
  const sanitized = summary.replace(/<\/untrusted>/g, "</untrusted_escaped>");
  return `<untrusted source="conversation_summary">\n${sanitized}\n</untrusted>`;
}
