import { analyzeProject, generateExample, generateTurboPatch } from "@envdoctor/core";
import { printOrWrite } from "../io.js";

interface FixOptions {
  cwd?: string;
  write?: boolean;
}

export async function fixCommand(options: FixOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  await printOrWrite([
    await generateExample(result),
    await generateTurboPatch(result)
  ], Boolean(options.write));
}
