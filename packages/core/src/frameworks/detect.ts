import type { FrameworkId, PackageInfo, ProjectContext } from "../types.js";

export function detectFrameworks(packages: PackageInfo[], hasTurbo: boolean, workflowCount: number): Set<FrameworkId> {
  const frameworks = new Set<FrameworkId>(["node"]);

  for (const workspacePackage of packages) {
    for (const framework of workspacePackage.frameworks) {
      frameworks.add(framework);
    }
  }

  if (hasTurbo) {
    frameworks.add("turbo");
  }

  if (workflowCount > 0) {
    frameworks.add("github-actions");
  }

  return frameworks;
}

export function hasFramework(context: ProjectContext, framework: FrameworkId): boolean {
  return context.frameworks.has(framework);
}
