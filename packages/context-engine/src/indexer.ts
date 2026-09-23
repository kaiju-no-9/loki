import type { FileEntry } from "@loki/types";

export interface CodebaseIndex {
  rootPath: string;
  totalFiles: number;
  fileTree: string[];
  summaryText: string;
}

export class CodebaseIndexer {
  public static generateIndexFromEntries(
    rootPath: string,
    entries: FileEntry[]
  ): CodebaseIndex {
    const ignoredDirs = new Set([
      "node_modules",
      ".git",
      ".next",
      "dist",
      "build",
      ".turbo",
    ]);

    const filtered = entries.filter((e) => {
      const parts = e.path.split("/");
      return !parts.some((p) => ignoredDirs.has(p));
    });

    const fileTree = filtered.map(
      (e) => `${e.isDir ? "[DIR]" : "[FILE]"} ${e.path || e.name}`
    );

    const summaryText = `Codebase Index for ${rootPath}:\nTotal items indexed: ${filtered.length}\nFiles:\n${fileTree.slice(0, 50).join("\n")}${filtered.length > 50 ? "\n... (truncated)" : ""}`;

    return {
      rootPath,
      totalFiles: filtered.length,
      fileTree,
      summaryText,
    };
  }
}
