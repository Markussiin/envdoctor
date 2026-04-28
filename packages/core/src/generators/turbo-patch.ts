import path from "node:path";
import type { AnalysisResult, GeneratedFile } from "../types.js";

export async function generateTurboPatch(result: AnalysisResult): Promise<GeneratedFile | undefined> {
  const turboDiagnostics = result.diagnostics.filter((diagnostic) => diagnostic.id === "turbo-strict-mode" && diagnostic.key);

  if (turboDiagnostics.length === 0) {
    return undefined;
  }

  const additions: Record<string, string[]> = {};

  for (const diagnostic of turboDiagnostics) {
    const task = diagnostic.title.match(/turbo ([a-z:_-]+)/i)?.[1] ?? "build";
    additions[task] ??= [];

    if (diagnostic.key && !additions[task].includes(diagnostic.key)) {
      additions[task].push(diagnostic.key);
    }
  }

  for (const values of Object.values(additions)) {
    values.sort();
  }

  const contents = `${JSON.stringify({
    "$schema": "https://turbo.build/schema.json",
    note: "Review these suggested env additions, then merge them into turbo.json.",
    tasks: Object.fromEntries(
      Object.entries(additions).map(([task, env]) => [task, { env }])
    )
  }, null, 2)}\n`;

  return {
    path: path.join(result.context.root, "turbo.env.patch.json"),
    contents,
    changed: true
  };
}
