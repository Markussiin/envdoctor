import { readFile } from "node:fs/promises";
import fg from "fast-glob";

const SCHEMA_FILE_PATTERNS = [
  "**/env.schema.{ts,tsx,js,mjs,cjs}",
  "**/src/env.{ts,tsx,js,mjs,cjs}",
  "**/src/env.schema.{ts,tsx,js,mjs,cjs}"
];

const ENV_KEY_PATTERN = /\b([A-Z][A-Z0-9_]{1,})\s*:/g;

export async function readSchemaKeys(root: string): Promise<Set<string>> {
  const files = await fg(SCHEMA_FILE_PATTERNS, {
    cwd: root,
    absolute: true,
    dot: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**", "**/coverage/**"]
  });

  const keys = new Set<string>();

  for (const file of files) {
    const contents = await readFile(file, "utf8");
    for (const match of contents.matchAll(ENV_KEY_PATTERN)) {
      if (match[1]) {
        keys.add(match[1]);
      }
    }
  }

  return keys;
}
