import { analyzeProject, toJsonReport } from "@envdoctor/core";
import { renderDoctor } from "../output.js";

interface DoctorOptions {
  cwd?: string;
  json?: boolean;
}

export async function doctorCommand(options: DoctorOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  console.log(options.json ? toJsonReport(result) : renderDoctor(result));
}
