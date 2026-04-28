import type { Diagnostic, ProjectContext } from "../types.js";
import { GITHUB_BUILT_INS, isDocumentedKey } from "./helpers.js";

export function githubActionsRule(context: ProjectContext): Diagnostic[] {
  return context.workflowReferences
    .filter((reference) => reference.kind === "secrets" || reference.kind === "vars")
    .filter((reference) => !GITHUB_BUILT_INS.has(reference.key))
    .filter((reference) => !isDocumentedKey(context, reference.key))
    .map((reference) => ({
      id: "github-actions-undocumented-env",
      severity: "high",
      title: `${reference.kind}.${reference.key} is not represented in env docs`,
      message: `.github workflow references ${reference.kind}.${reference.key}, but ${reference.key} is missing from .env.example and known env schema files.`,
      fix: `Add ${reference.key}= to .env.example or document it in env.schema.ts.`,
      framework: "github-actions",
      key: reference.key,
      filePath: reference.filePath,
      relativePath: reference.relativePath,
      line: reference.line,
      column: reference.column
    }));
}
