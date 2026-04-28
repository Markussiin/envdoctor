#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { ciCommand } from "./commands/ci.js";
import { doctorCommand } from "./commands/doctor.js";
import { fixCommand } from "./commands/fix.js";
import {
  generateExampleCommand,
  generateSchemaCommand,
  generateViteTypesCommand,
  generateWorkflowCommand
} from "./commands/generate.js";
import { scanCommand } from "./commands/scan.js";

const program = new Command();

program
  .name("envdoctor")
  .description("Diagnose missing, leaked, stale, and misconfigured environment variables in JS/TS repos.")
  .version("0.1.0");

program
  .command("scan")
  .description("List static environment variable references")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--json", "print JSON output")
  .action(scanCommand);

program
  .command("doctor", { isDefault: true })
  .description("Run framework-aware env diagnostics")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--json", "print JSON output")
  .action(doctorCommand);

program
  .command("ci")
  .description("Run diagnostics and exit non-zero on high-impact issues")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--json", "print JSON output")
  .option("--fail-on <severity>", "minimum severity that fails CI", "high")
  .action(ciCommand);

program
  .command("fix")
  .description("Generate conservative fix files")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--write", "write generated files")
  .action(fixCommand);

const generate = program
  .command("generate")
  .description("Generate env support files");

generate
  .command("example")
  .description("Generate .env.example from discovered usage and env files")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--write", "write .env.example")
  .action(generateExampleCommand);

generate
  .command("schema")
  .description("Generate a TypeScript env schema")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--target <target>", "schema target", "zod")
  .option("--write", "write env.schema.ts")
  .action(generateSchemaCommand);

generate
  .command("vite-types")
  .description("Generate vite-env.d.ts for discovered VITE_* keys")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--write", "write vite-env.d.ts")
  .action(generateViteTypesCommand);

generate
  .command("workflow")
  .description("Generate a GitHub Actions EnvDoctor workflow")
  .option("--cwd <path>", "repo root to scan", process.cwd())
  .option("--write", "write .github/workflows/envdoctor.yml")
  .action(generateWorkflowCommand);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error) {
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "commander.helpDisplayed" || error.code === "commander.version") {
      process.exitCode = 0;
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(pc.red(message));
      process.exitCode = 1;
    }
  } else {
    const message = error instanceof Error ? error.message : String(error);
    console.error(pc.red(message));
    process.exitCode = 1;
  }
}
