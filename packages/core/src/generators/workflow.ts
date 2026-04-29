import path from "node:path";
import type { AnalysisResult, GeneratedFile } from "../types.js";

export async function generateWorkflow(result: AnalysisResult): Promise<GeneratedFile> {
  const filePath = path.join(result.context.root, ".github", "workflows", "envdoctor.yml");
  const contents = [
    "name: EnvDoctor",
    "",
    "on:",
    "  pull_request:",
    "",
    "jobs:",
    "  envdoctor:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      actions: read",
    "      contents: read",
    "      security-events: write",
    "    steps:",
    "      - uses: actions/checkout@v5",
    "      - uses: actions/setup-node@v5",
    "        with:",
    "          node-version: 24",
    "      - uses: Markussiin/envdoctor@v0",
    "        id: envdoctor",
    "        with:",
    "          fail-on: high",
    "          sarif: \"true\"",
    "          sarif-file: envdoctor.sarif",
    "      - name: Upload EnvDoctor code scanning results",
    "        uses: github/codeql-action/upload-sarif@v4",
    "        if: always()",
    "        with:",
    "          sarif_file: envdoctor.sarif",
    "          category: envdoctor",
    ""
  ].join("\n");

  return {
    path: filePath,
    contents,
    changed: true
  };
}
