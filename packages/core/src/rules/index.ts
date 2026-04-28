import type { Diagnostic, EnvUsage, ProjectContext } from "../types.js";
import { githubActionsRule } from "./github-actions.js";
import { missingFromExampleRule } from "./missing-from-example.js";
import { nextRules } from "./next.js";
import { nodeEnvFileRule } from "./node-env-file.js";
import { secretLeakRule } from "./secret-leak.js";
import { staleEnvExampleRule } from "./stale-env-example.js";
import { turboStrictModeRule } from "./turbo-strict-mode.js";
import { viteRules } from "./vite.js";
import { severityRank } from "./helpers.js";

export function runRules(context: ProjectContext, usages: EnvUsage[]): Diagnostic[] {
  const diagnostics = [
    ...missingFromExampleRule(context, usages),
    ...secretLeakRule(usages),
    ...viteRules(context, usages),
    ...nextRules(context, usages),
    ...turboStrictModeRule(context, usages),
    ...githubActionsRule(context),
    ...nodeEnvFileRule(context),
    ...staleEnvExampleRule(context)
  ];

  return dedupeDiagnostics(diagnostics).sort((a, b) => {
    const severityDelta = severityRank[b.severity] - severityRank[a.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return a.relativePath.localeCompare(b.relativePath) || a.line - b.line || a.title.localeCompare(b.title);
  });
}

function dedupeDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  const unique: Diagnostic[] = [];

  for (const diagnostic of diagnostics) {
    const signature = [
      diagnostic.id,
      diagnostic.key ?? "",
      diagnostic.relativePath,
      diagnostic.line,
      diagnostic.column
    ].join(":");

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(diagnostic);
    }
  }

  return unique;
}
