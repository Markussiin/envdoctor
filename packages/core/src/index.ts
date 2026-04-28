import path from "node:path";
import { readFile } from "node:fs/promises";
import { loadProjectContext } from "./project.js";
import { scanEnvUsages } from "./scanner/env-usages.js";
import { runRules } from "./rules/index.js";
import type { AnalysisResult, AnalyzeOptions } from "./types.js";

export async function analyzeProject(root = process.cwd(), options: AnalyzeOptions = {}): Promise<AnalysisResult> {
  const context = await loadProjectContext(root);
  const ignore = [
    ...await readEnvDoctorIgnore(context.root),
    ...(options.ignore ?? [])
  ];
  const { usages, dynamicUsages } = await scanEnvUsages(context.root, context.packages, options.include, ignore);
  const diagnostics = runRules(context, usages);

  return {
    context,
    usages,
    dynamicUsages,
    diagnostics
  };
}

async function readEnvDoctorIgnore(root: string): Promise<string[]> {
  try {
    const contents = await readFile(path.join(root, ".envdoctorignore"), "utf8");
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export * from "./types.js";
export * from "./generators/index.js";
export * from "./reporters/github-annotations.js";
export * from "./reporters/json.js";
export * from "./reporters/sarif.js";
export { severityRank } from "./rules/helpers.js";
