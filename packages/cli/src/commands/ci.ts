import { analyzeProject, severityRank, toJsonReport, type Severity } from "@envdoctor/core";
import { renderCi } from "../output.js";

interface CiOptions {
  cwd?: string;
  json?: boolean;
  failOn?: Severity;
}

export async function ciCommand(options: CiOptions): Promise<void> {
  const threshold = options.failOn ?? "high";
  if (!(threshold in severityRank)) {
    throw new Error(`Unsupported severity "${threshold}". Use critical, high, medium, low, or info.`);
  }

  const result = await analyzeProject(options.cwd ?? process.cwd());
  const failing = result.diagnostics.filter((diagnostic) => severityRank[diagnostic.severity] >= severityRank[threshold]);

  console.log(options.json ? toJsonReport(result) : renderCi(result, threshold));

  if (failing.length > 0) {
    process.exitCode = 1;
  }
}
