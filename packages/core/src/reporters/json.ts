import type { AnalysisResult, Diagnostic } from "../types.js";

export function toJsonReport(result: AnalysisResult): string {
  return `${JSON.stringify({
    summary: {
      usages: result.usages.length,
      dynamicUsages: result.dynamicUsages.length,
      diagnostics: result.diagnostics.length,
      frameworks: [...result.context.frameworks].sort(),
      packageManager: result.context.packageManager
    },
    usages: result.usages,
    dynamicUsages: result.dynamicUsages,
    diagnostics: result.diagnostics.map(serializeDiagnostic)
  }, null, 2)}\n`;
}

function serializeDiagnostic(diagnostic: Diagnostic): Diagnostic {
  return diagnostic;
}
