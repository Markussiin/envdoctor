import { loadProjectContext } from "./project.js";
import { scanEnvUsages } from "./scanner/env-usages.js";
import { runRules } from "./rules/index.js";
import type { AnalysisResult, AnalyzeOptions } from "./types.js";

export async function analyzeProject(root = process.cwd(), options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const context = await loadProjectContext(root);
  const { usages, dynamicUsages } = await scanEnvUsages(context.root, context.packages, options.include, options.ignore);
  const diagnostics = runRules(context, usages);

  return {
    context,
    usages,
    dynamicUsages,
    diagnostics
  };
}

export * from "./types.js";
export * from "./generators/index.js";
export * from "./reporters/json.js";
export { severityRank } from "./rules/helpers.js";
