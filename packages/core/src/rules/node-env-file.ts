import path from "node:path";
import { existsSync } from "node:fs";
import type { Diagnostic, ProjectContext } from "../types.js";

const ENV_FILE_ARG_PATTERN = /--env-file(?:=|\s+)(["']?)([^\s"']+)\1/g;

export function nodeEnvFileRule(context: ProjectContext): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const packageInfo of context.packages) {
    for (const [scriptName, script] of Object.entries(packageInfo.scripts)) {
      if (script.includes("--env-file-if-exists")) {
        continue;
      }

      for (const match of script.matchAll(ENV_FILE_ARG_PATTERN)) {
        const envFile = match[2];

        if (!envFile) {
          continue;
        }

        const resolved = path.resolve(packageInfo.dir, envFile);

        if (existsSync(resolved)) {
          continue;
        }

        diagnostics.push({
          id: "node-env-file-missing",
          severity: "medium",
          title: `${scriptName} references a missing env file`,
          message: `${packageInfo.name} script "${scriptName}" uses --env-file=${envFile}, and Node exits with an error when that file is absent.`,
          fix: `Create ${envFile} or use --env-file-if-exists=${envFile} for optional local files.`,
          framework: "node",
          filePath: path.join(packageInfo.dir, "package.json"),
          relativePath: packageInfo.relativeDir === "." ? "package.json" : `${packageInfo.relativeDir}/package.json`,
          line: 1,
          column: 1
        });
      }
    }
  }

  return diagnostics;
}
