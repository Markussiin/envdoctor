import type { Diagnostic, EnvUsage } from "../types.js";
import { isPublicClientKey, isSecretLike } from "./helpers.js";

export function secretLeakRule(usages: EnvUsage[]): Diagnostic[] {
  return usages
    .filter((usage) => isPublicClientKey(usage.key) && isSecretLike(usage.key))
    .map((usage) => ({
      id: "public-secret-leak",
      severity: "high",
      title: `${usage.key} may expose a secret`,
      message: `${usage.key} looks sensitive and is named like a browser-exposed environment variable.`,
      fix: "Move the secret to a server-only variable and expose only a non-sensitive public value.",
      framework: usage.key.startsWith("VITE_") ? "vite" : "next",
      key: usage.key,
      filePath: usage.filePath,
      relativePath: usage.relativePath,
      line: usage.line,
      column: usage.column
    }));
}
