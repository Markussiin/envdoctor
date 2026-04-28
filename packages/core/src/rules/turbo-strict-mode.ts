import type { Diagnostic, EnvUsage, ProjectContext, TurboTaskInfo } from "../types.js";
import { packageForUsage, wildcardMatches } from "./helpers.js";

const TASKS_TO_CHECK = ["build", "test", "lint", "dev"];

export function turboStrictModeRule(context: ProjectContext, usages: EnvUsage[]): Diagnostic[] {
  if (!context.turbo) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const firstUsageByPackageAndKey = new Map<string, EnvUsage>();

  for (const usage of usages) {
    const packageInfo = packageForUsage(context, usage);
    const signature = `${packageInfo?.dir ?? usage.packageDir}:${usage.key}`;

    if (!firstUsageByPackageAndKey.has(signature)) {
      firstUsageByPackageAndKey.set(signature, usage);
    }
  }

  for (const usage of firstUsageByPackageAndKey.values()) {
    const packageInfo = packageForUsage(context, usage);

    if (!packageInfo) {
      continue;
    }

    for (const taskName of TASKS_TO_CHECK) {
      if (!(taskName in packageInfo.scripts) || !context.turbo.tasks[taskName]) {
        continue;
      }

      if (isDeclaredForTask(context, taskName, usage.key)) {
        continue;
      }

      diagnostics.push({
        id: "turbo-strict-mode",
        severity: taskName === "build" ? "high" : "medium",
        title: `${usage.key} is not declared for turbo ${taskName}`,
        message: `${packageInfo.relativeDir} uses ${usage.key}, but turbo.json does not list it for the ${taskName} task or global env.`,
        fix: `Add ${usage.key} to tasks.${taskName}.env or globalEnv in turbo.json.`,
        framework: "turbo",
        key: usage.key,
        filePath: usage.filePath,
        relativePath: usage.relativePath,
        line: usage.line,
        column: usage.column
      });
    }
  }

  return diagnostics;
}

function isDeclaredForTask(context: ProjectContext, taskName: string, key: string): boolean {
  const turbo = context.turbo;

  if (!turbo) {
    return true;
  }

  const task = turbo.tasks[taskName] ?? emptyTask();
  const candidates = [
    ...turbo.globalEnv,
    ...turbo.globalPassThroughEnv,
    ...task.env,
    ...task.passThroughEnv
  ];

  return candidates.some((pattern) => wildcardMatches(pattern, key));
}

function emptyTask(): TurboTaskInfo {
  return {
    env: [],
    passThroughEnv: []
  };
}
