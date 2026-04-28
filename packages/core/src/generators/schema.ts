import path from "node:path";
import type { AnalysisResult, GeneratedFile } from "../types.js";
import { isPublicClientKey } from "../rules/helpers.js";

export async function generateZodSchema(result: AnalysisResult): Promise<GeneratedFile> {
  const filePath = path.join(result.context.root, "env.schema.ts");
  const keys = [...new Set(result.usages.map((usage) => usage.key))].sort();
  const lines = [
    "import { z } from \"zod\";",
    "",
    "export const envSchema = z.object({",
    ...keys.map((key) => `  ${key}: ${zodExpressionForKey(key)},`),
    "});",
    "",
    "export const env = envSchema.parse(process.env);",
    ""
  ];

  return {
    path: filePath,
    contents: lines.join("\n"),
    changed: true
  };
}

function zodExpressionForKey(key: string): string {
  if (key === "NODE_ENV") {
    return "z.enum([\"development\", \"test\", \"production\"])";
  }

  if (/URL$|URI$/.test(key)) {
    return "z.string().url()";
  }

  if (/PORT$/.test(key)) {
    return "z.coerce.number().int().positive()";
  }

  if (isPublicClientKey(key)) {
    return "z.string().min(1)";
  }

  return "z.string().min(1)";
}
