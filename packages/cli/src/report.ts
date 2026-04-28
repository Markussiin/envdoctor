import pc from "picocolors";
import {
  toGithubAnnotations,
  toJsonReport,
  toSarifReport,
  type AnalysisResult
} from "@envdoctor/core";
import { writeTextFile } from "./io.js";

export type ReportFormat = "terminal" | "json" | "sarif";

interface ReportOptions {
  format?: string;
  json?: boolean;
  output?: string;
  githubAnnotations?: boolean;
}

export function resolveReportFormat(options: ReportOptions): ReportFormat {
  if (options.json) {
    return "json";
  }

  const format = options.format ?? "terminal";

  if (format === "terminal" || format === "json" || format === "sarif") {
    return format;
  }

  throw new Error(`Unsupported format "${format}". Use terminal, json, or sarif.`);
}

export async function emitReport(
  result: AnalysisResult,
  format: ReportFormat,
  renderTerminal: () => string,
  options: ReportOptions
): Promise<void> {
  if (options.githubAnnotations) {
    const annotations = toGithubAnnotations(result);
    if (annotations.length > 0) {
      console.error(annotations);
    }
  }

  const contents = format === "json"
    ? toJsonReport(result)
    : format === "sarif"
      ? toSarifReport(result)
      : `${renderTerminal()}\n`;

  if (options.output) {
    await writeTextFile(options.output, contents);
    console.error(`${pc.green("wrote")} ${options.output}`);
    return;
  }

  process.stdout.write(contents);
}
