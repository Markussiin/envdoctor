import path from "node:path";
import type { AnalysisResult, GeneratedFile } from "../types.js";

export async function generateWorkflow(result: AnalysisResult): Promise<GeneratedFile> {
  const filePath = path.join(result.context.root, ".github", "workflows", "envdoctor.yml");
  const packageManager = result.context.packageManager.split("@")[0] ?? "npm";
  const runner = packageManager === "pnpm"
    ? "pnpm envdoctor ci"
    : packageManager === "yarn"
      ? "yarn envdoctor ci"
      : "npx envdoctor ci";

  const contents = [
    "name: EnvDoctor",
    "",
    "on:",
    "  pull_request:",
    "",
    "env:",
    "  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true",
    "",
    "jobs:",
    "  envdoctor:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: 24",
    `      - run: ${runner}`,
    ""
  ].join("\n");

  return {
    path: filePath,
    contents,
    changed: true
  };
}
