import {
  analyzeProject,
  generateExample,
  generateViteTypes,
  generateWorkflow,
  generateZodSchema
} from "@envdoctor/core";
import { printOrWrite } from "../io.js";

interface GenerateOptions {
  cwd?: string;
  write?: boolean;
  target?: string;
}

export async function generateExampleCommand(options: GenerateOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  await printOrWrite([await generateExample(result)], Boolean(options.write));
}

export async function generateSchemaCommand(options: GenerateOptions): Promise<void> {
  if (options.target && options.target !== "zod") {
    throw new Error(`Unsupported schema target: ${options.target}`);
  }

  const result = await analyzeProject(options.cwd ?? process.cwd());
  await printOrWrite([await generateZodSchema(result)], Boolean(options.write));
}

export async function generateViteTypesCommand(options: GenerateOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  await printOrWrite([await generateViteTypes(result)], Boolean(options.write));
}

export async function generateWorkflowCommand(options: GenerateOptions): Promise<void> {
  const result = await analyzeProject(options.cwd ?? process.cwd());
  await printOrWrite([await generateWorkflow(result)], Boolean(options.write));
}
