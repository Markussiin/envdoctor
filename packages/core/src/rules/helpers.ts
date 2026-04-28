import type { EnvUsage, PackageInfo, ProjectContext, Severity } from "../types.js";
import { isSubPath } from "../utils/path.js";

export const severityRank: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

export const VITE_BUILT_INS = new Set(["MODE", "BASE_URL", "PROD", "DEV", "SSR"]);

export const GITHUB_BUILT_INS = new Set([
  "GITHUB_TOKEN",
  "ACTIONS_RUNTIME_TOKEN",
  "ACTIONS_ID_TOKEN_REQUEST_TOKEN",
  "ACTIONS_STEP_DEBUG"
]);

export function isDocumentedKey(context: ProjectContext, key: string): boolean {
  return context.exampleKeys.has(key) || context.schemaKeys.has(key);
}

export function isSecretLike(key: string): boolean {
  return /(^|_)(SECRET|TOKEN|PASSWORD|PASS|PRIVATE|CREDENTIAL|AUTH|SESSION|COOKIE|JWT)(_|$)/i.test(key)
    || /STRIPE_SECRET/i.test(key)
    || /API_KEY$/i.test(key);
}

export function isPublicClientKey(key: string): boolean {
  return key.startsWith("VITE_")
    || key.startsWith("NEXT_PUBLIC_")
    || key.startsWith("PUBLIC_")
    || key.startsWith("NUXT_PUBLIC_");
}

export function packageForUsage(context: ProjectContext, usage: EnvUsage): PackageInfo | undefined {
  return context.packages
    .sort((a, b) => b.dir.length - a.dir.length)
    .find((workspacePackage) => isSubPath(workspacePackage.dir, usage.filePath));
}

export function wildcardMatches(pattern: string, key: string): boolean {
  if (pattern === key || pattern === "*") {
    return true;
  }

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  return new RegExp(`^${escaped}$`).test(key);
}
