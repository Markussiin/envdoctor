import { analyzeProject, severityRank, type Severity } from "@envdoctor/core";
import { renderCi } from "../output.js";
import { emitReport, resolveReportFormat } from "../report.js";

interface CiOptions {
  cwd?: string;
  format?: string;
  json?: boolean;
  output?: string;
  githubAnnotations?: boolean;
  failOn?: Severity;
}

export async function ciCommand(options: CiOptions): Promise<void> {
  const threshold = options.failOn ?? "high";
  if (!(threshold in severityRank)) {
    throw new Error(`Unsupported severity "${threshold}". Use critical, high, medium, low, or info.`);
  }

  const result = await analyzeProject(options.cwd ?? process.cwd());
  const failing = result.diagnostics.filter((diagnostic) => severityRank[diagnostic.severity] >= severityRank[threshold]);
  const format = resolveReportFormat(options);

  await emitReport(result, format, () => renderCi(result, threshold), options);

  if (failing.length > 0) {
    process.exitCode = 1;
  }
}
