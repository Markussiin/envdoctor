import type { AnalysisResult, Diagnostic } from "../types.js";

export function toGithubAnnotations(result: AnalysisResult): string {
  return result.diagnostics.map(toAnnotation).join("\n");
}

function toAnnotation(diagnostic: Diagnostic): string {
  const level = diagnostic.severity === "critical" || diagnostic.severity === "high"
    ? "error"
    : diagnostic.severity === "medium"
      ? "warning"
      : "notice";
  const properties = [
    `file=${escapeProperty(diagnostic.relativePath)}`,
    `line=${diagnostic.line}`,
    `col=${diagnostic.column}`,
    `title=${escapeProperty(`${diagnostic.severity.toUpperCase()}: ${diagnostic.title}`)}`
  ].join(",");
  const message = diagnostic.fix
    ? `${diagnostic.message}\nFix: ${diagnostic.fix}`
    : diagnostic.message;

  return `::${level} ${properties}::${escapeData(message)}`;
}

function escapeData(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}
