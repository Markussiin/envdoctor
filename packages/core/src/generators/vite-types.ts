import path from "node:path";
import type { AnalysisResult, GeneratedFile } from "../types.js";

export async function generateViteTypes(result: AnalysisResult): Promise<GeneratedFile> {
  const filePath = path.join(result.context.root, "vite-env.d.ts");
  const viteKeys = [...new Set(result.usages
    .filter((usage) => usage.source === "import.meta.env" && usage.key.startsWith("VITE_"))
    .map((usage) => usage.key))]
    .sort();

  const lines = [
    "/// <reference types=\"vite/client\" />",
    "",
    "interface ImportMetaEnv {",
    ...viteKeys.map((key) => `  readonly ${key}: string;`),
    "}",
    "",
    "interface ImportMeta {",
    "  readonly env: ImportMetaEnv;",
    "}",
    ""
  ];

  return {
    path: filePath,
    contents: lines.join("\n"),
    changed: true
  };
}
