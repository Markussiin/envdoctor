import type { Diagnostic, EnvUsage, ProjectContext } from "../types.js";
import { isSecretLike } from "./helpers.js";

export function nextRules(context: ProjectContext, usages: EnvUsage[]): Diagnostic[] {
  if (!context.frameworks.has("next")) {
    return [];
  }

  const clientServerEnv = usages
    .filter((usage) => usage.source === "process.env")
    .filter((usage) => usage.isClientFile)
    .filter((usage) => !usage.key.startsWith("NEXT_PUBLIC_"))
    .map((usage): Diagnostic => ({
      id: "next-client-private-env",
      severity: "high",
      title: `${usage.key} is read from a Next.js client file`,
      message: `process.env.${usage.key} is used in client code, but Next.js only inlines NEXT_PUBLIC_* variables into browser bundles.`,
      fix: "Move this read to server code or expose a non-sensitive NEXT_PUBLIC_* value.",
      framework: "next",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));

  const publicSecret = usages
    .filter((usage) => usage.key.startsWith("NEXT_PUBLIC_") && isSecretLike(usage.key))
    .map((usage): Diagnostic => ({
      id: "next-public-secret",
      severity: "high",
      title: `${usage.key} may expose a secret`,
      message: `${usage.key} starts with NEXT_PUBLIC_, so Next.js can inline it into browser JavaScript at build time.`,
      fix: "Use a server-only variable for secrets and pass only safe data to the client.",
      framework: "next",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));

  const publicBuildTime = usages
    .filter((usage) => usage.key.startsWith("NEXT_PUBLIC_"))
    .map((usage): Diagnostic => ({
      id: "next-public-build-time",
      severity: "low",
      title: `${usage.key} is inlined at next build time`,
      message: `${usage.key} is public in Next.js and will be frozen into the client bundle during next build.`,
      fix: "Use server-rendered runtime configuration if this value must change after build.",
      framework: "next",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));

  return [...clientServerEnv, ...publicSecret, ...publicBuildTime];
}
