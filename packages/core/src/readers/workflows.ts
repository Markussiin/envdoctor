import path from "node:path";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import { parseDocument } from "yaml";
import type { WorkflowReference, WorkflowReferenceKind } from "../types.js";
import { relativePath } from "../utils/path.js";

const REFERENCE_PATTERN = /\$\{\{\s*(secrets|vars|env)\.([A-Z_][A-Z0-9_]*)\s*\}\}/g;

export async function readWorkflowReferences(root: string): Promise<WorkflowReference[]> {
  const files = await fg(".github/workflows/**/*.{yml,yaml}", {
    cwd: root,
    absolute: true,
    dot: true,
    ignore: ["**/node_modules/**"]
  });

  const references: WorkflowReference[] = [];

  for (const filePath of files.sort()) {
    const contents = await readFile(filePath, "utf8");
    parseDocument(contents, { prettyErrors: false });
    const lineStarts = lineStartOffsets(contents);

    for (const match of contents.matchAll(REFERENCE_PATTERN)) {
      const index = match.index ?? 0;
      const location = offsetToLocation(lineStarts, index);
      references.push({
        filePath,
        relativePath: relativePath(root, filePath),
        line: location.line,
        column: location.column,
        kind: match[1] as WorkflowReferenceKind,
        key: match[2] ?? ""
      });
    }
  }

  return references;
}

function lineStartOffsets(contents: string): number[] {
  const offsets = [0];

  for (let index = 0; index < contents.length; index += 1) {
    if (contents[index] === "\n") {
      offsets.push(index + 1);
    }
  }

  return offsets;
}

function offsetToLocation(lineStarts: number[], offset: number): { line: number; column: number } {
  let line = 0;

  for (let index = 0; index < lineStarts.length; index += 1) {
    if (lineStarts[index]! <= offset) {
      line = index;
    } else {
      break;
    }
  }

  return {
    line: line + 1,
    column: offset - lineStarts[line]! + 1
  };
}
