import path from "node:path";

export function resolveSafePath(workDir: string, targetPath: string): string {
  const normalizedWorkDir = path.resolve(workDir);
  const resolvedTarget = path.resolve(normalizedWorkDir, targetPath);

  if (!resolvedTarget.startsWith(normalizedWorkDir)) {
    throw new Error(
      `Refused: Access outside project working directory (${targetPath}) is forbidden.`
    );
  }

  return resolvedTarget;
}
