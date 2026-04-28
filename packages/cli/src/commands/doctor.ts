import { analyzeProject } from "@envdoctor/core";
import { renderDoctor } from "../output.js";
import { emitReport, resolveReportFormat } from "../report.js";

interface DoctorOptions {
  cwd?: string;
  format?: string;
  json?: boolean;
  output?: string;
  githubAnnotations?: boolean;
}

export async function doctorCommand(options: DoctorOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  const format = resolveReportFormat(options);
  await emitReport(result, format, () => renderDoctor(result), options);
}
