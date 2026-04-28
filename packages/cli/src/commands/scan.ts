import { analyzeProject, toJsonReport } from "@envdoctor/core";
import { renderScan } from "../output.js";

interface ScanOptions {
  cwd?: string;
  json?: boolean;
}

export async function scanCommand(options: ScanOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  console.log(options.json ? toJsonReport(result) : renderScan(result));
}
