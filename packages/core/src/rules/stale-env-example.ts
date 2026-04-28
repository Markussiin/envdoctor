import type { Diagnostic, ProjectContext } from "../types.js";

export function staleEnvExampleRule(context: ProjectContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const envFile of context.envFiles) {
    if (envFile.kind.includes("example")) {
      continue;
    }

    for (const key of envFile.keys) {
      if (context.exampleKeys.has(key)) {
        continue;
      }

      diagnostics.push({
        id: "env-file-not-in-example",
        severity: "low",
        title: `${key} appears in ${envFile.kind} but not .env.example`,
        message: `${key} is present in ${envFile.relativePath}, but it is not documented in any .env.example file.`,
        fix: `Add ${key}= to .env.example if it is required for contributors or deployment.`,
        framework: "node",
        key,
        filePath: envFile.path,
        relativePath: envFile.relativePath,
        line: 1,
        column: 1
      });
    }
  }

  return diagnostics;
}
