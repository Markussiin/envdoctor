import { collectExampleKeys, readEnvFiles } from "./readers/dotenv.js";
import { readPackages } from "./readers/package-json.js";
import { readSchemaKeys } from "./readers/schema.js";
import { readTurboJson } from "./readers/turbo-json.js";
import { readWorkflowReferences } from "./readers/workflows.js";
import { detectFrameworks } from "./frameworks/detect.js";
import { normalizeRoot } from "./utils/path.js";
import type { ProjectContext } from "./types.js";

export async function loadProjectContext(root: string): Promise<ProjectContext> {
  const normalizedRoot = normalizeRoot(root);
  const [{ packages, rootPackage, packageManager }, envFiles, schemaKeys, turbo, workflowReferences] = await Promise.all([
    readPackages(normalizedRoot),
    readEnvFiles(normalizedRoot),
    readSchemaKeys(normalizedRoot),
    readTurboJson(normalizedRoot),
    readWorkflowReferences(normalizedRoot)
  ]);

  return {
    root: normalizedRoot,
    packageManager,
    rootPackage,
    packages,
    envFiles,
    exampleKeys: collectExampleKeys(envFiles),
    schemaKeys,
    turbo,
    workflowReferences,
    frameworks: detectFrameworks(packages, Boolean(turbo), workflowReferences.length)
  };
}
