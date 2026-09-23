export interface FeatureSpecification {
  title: string;
  subGoals: string[];
  acceptanceCriteria: string[];
  rawPrompt: string;
}

export class SpecParser {
  public static parsePrompt(prompt: string): FeatureSpecification {
    const lines = prompt
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const title = lines[0] || "Execute feature prompt";
    const subGoals: string[] = [];
    const acceptanceCriteria: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.startsWith("-") ||
        line.startsWith("*") ||
        /^\d+\./.test(line)
      ) {
        subGoals.push(line.replace(/^[-*\d.]+\s*/, ""));
      } else if (line.toLowerCase().includes("accept") || line.toLowerCase().includes("verify")) {
        acceptanceCriteria.push(line);
      }
    }

    if (subGoals.length === 0) {
      subGoals.push(prompt);
    }
    if (acceptanceCriteria.length === 0) {
      acceptanceCriteria.push("Task finishes cleanly with verification tests.");
    }

    return {
      title,
      subGoals,
      acceptanceCriteria,
      rawPrompt: prompt,
    };
  }

  public static formatSpecMarkdown(spec: FeatureSpecification): string {
    return `### Feature Specification: ${spec.title}\n` +
      `**Sub-Goals:**\n` +
      spec.subGoals.map((g, idx) => `${idx + 1}. ${g}`).join("\n") +
      `\n\n**Acceptance Criteria:**\n` +
      spec.acceptanceCriteria.map((c) => `- ${c}`).join("\n");
  }
}
