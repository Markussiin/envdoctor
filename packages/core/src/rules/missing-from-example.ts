import type { Diagnostic, EnvUsage, ProjectContext } from "../types.js";
import { isDocumentedKey } from "./helpers.js";

export function missingFromExampleRule(context: ProjectContext, usages: EnvUsage[]): Diagnostic[] {
  const firstByKey = new Map<string, EnvUsage>();

  for (const usage of usages) {
    if (!firstByKey.has(usage.key)) {
      firstByKey.set(usage.key, usage);
    }
  }

  return [...firstByKey.values()]
    .filter((usage) => !isDocumentedKey(context, usage.key))
    .map((usage) => ({
      id: "missing-from-example",
      severity: "critical",
      title: `${usage.key} is used but not documented`,
      message: `${usage.key} is referenced in code but is missing from .env.example and known env schema files.`,
      fix: `Add ${usage.key}= to .env.example or define it in env.schema.ts.`,
      framework: "node",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));
}
