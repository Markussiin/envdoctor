import path from "node:path";
import { readFileSync } from "node:fs";
import type { Diagnostic, EnvUsage, ProjectContext } from "../types.js";
import { VITE_BUILT_INS } from "./helpers.js";

export function viteRules(context: ProjectContext, usages: EnvUsage[]): Diagnostic[] {
  if (!context.frameworks.has("vite")) {
    return [];
  }

  return [
    ...vitePrefixRule(usages),
    ...viteConfigEnvRule(usages),
    ...viteBuildTimeRule(usages)
  ];
}

function vitePrefixRule(usages: EnvUsage[]): Diagnostic[] {
  return usages
    .filter((usage) => usage.source === "import.meta.env")
    .filter((usage) => !VITE_BUILT_INS.has(usage.key) && !usage.key.startsWith("VITE_"))
    .map((usage) => ({
      id: "vite-prefix",
      severity: "high",
      title: `${usage.key} is not exposed by Vite's default env prefix`,
      message: `import.meta.env.${usage.key} is used, but Vite only exposes VITE_* variables to client code by default.`,
      fix: `Rename it to VITE_${usage.key} or configure envPrefix intentionally.`,
      framework: "vite",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));
}

function viteConfigEnvRule(usages: EnvUsage[]): Diagnostic[] {
  const configProcessUsages = usages.filter((usage) =>
    usage.source === "process.env" && /^vite\.config\./.test(path.basename(usage.filePath))
  );

  return configProcessUsages
    .filter((usage) => !fileContainsLoadEnv(usage.filePath))
    .map((usage) => ({
      id: "vite-config-process-env",
      severity: "medium",
      title: `Vite config reads process.env.${usage.key}`,
      message: `process.env.${usage.key} is read while evaluating vite.config, before Vite loads .env files for the selected mode.`,
      fix: "Use loadEnv(mode, process.cwd(), \"\") inside defineConfig.",
      framework: "vite",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));
}

function viteBuildTimeRule(usages: EnvUsage[]): Diagnostic[] {
  return usages
    .filter((usage) => usage.source === "import.meta.env" && !VITE_BUILT_INS.has(usage.key))
    .map((usage) => ({
      id: "vite-build-time-env",
      severity: "low",
      title: `${usage.key} is bundled at build time by Vite`,
      message: `import.meta.env.${usage.key} is statically replaced during build; changing the server environment after build will not update the client bundle.`,
      fix: "For runtime configuration, serve a generated config endpoint or script instead of relying on import.meta.env.",
      framework: "vite",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));
}

function fileContainsLoadEnv(filePath: string): boolean {
  try {
    return readFileSync(filePath, "utf8").includes("loadEnv(");
  } catch {
    return false;
  }
}
