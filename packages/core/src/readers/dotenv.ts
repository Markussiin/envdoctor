import path from "node:path";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { parse } from "dotenv";
import { relativePath } from "../utils/path.js";
import type { EnvFileInfo } from "../types.js";

const ENV_FILE_PATTERN = "**/.env{,.*}";

export async function readEnvFiles(root: string): Promise<EnvFileInfo[]> {
  const files = await fg(ENV_FILE_PATTERN, {
    cwd: root,
    absolute: true,
    dot: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**", "**/coverage/**"]
  });

  const envFiles: EnvFileInfo[] = [];

  for (const file of files.sort()) {
    const contents = await readFile(file, "utf8");
    const values = parse(contents);

    envFiles.push({
      path: file,
      relativePath: relativePath(root, file),
      kind: path.basename(file),
      keys: Object.keys(values).sort(),
      values
    });
  }

  return envFiles;
}

export function collectExampleKeys(envFiles: EnvFileInfo[]): Set<string> {
  return new Set(
    envFiles
      .filter((file) => file.kind.includes("example"))
      .flatMap((file) => file.keys)
  );
}

export function collectKnownEnvKeys(envFiles: EnvFileInfo[]): Set<string> {
  return new Set(envFiles.flatMap((file) => file.keys));
}
