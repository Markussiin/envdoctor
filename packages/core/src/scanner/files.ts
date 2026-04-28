import fg from "fast-glob";

export const DEFAULT_CODE_PATTERNS = [
  "**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"
];

export const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.git/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/out/**",
  "**/*.d.ts"
];

export async function findCodeFiles(root: string, include = DEFAULT_CODE_PATTERNS, ignore = DEFAULT_IGNORE_PATTERNS): Promise<string[]> {
  return fg(include, {
    cwd: root,
    absolute: true,
    dot: true,
    ignore
  });
}
