import path from "node:path";
import { access } from "node:fs/promises";
import fg from "fast-glob";
import { asRecord, readJsonFile, stringRecord } from "../utils/json.js";
import { relativePath } from "../utils/path.js";
import type { FrameworkId, PackageInfo } from "../types.js";

interface PackageJson {
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function workspacePatterns(packageJson: PackageJson | undefined): string[] {
  const workspaces = packageJson?.workspaces;

  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages;
  }

  return [];
}

function dependencyMap(packageJson: PackageJson): Record<string, string> {
  return {
    ...stringRecord(packageJson.dependencies),
    ...stringRecord(packageJson.devDependencies)
  };
}

async function detectFrameworks(root: string, dir: string, packageJson: PackageJson): Promise<FrameworkId[]> {
  const dependencies = dependencyMap(packageJson);
  const frameworks = new Set<FrameworkId>(["node"]);

  if ("next" in dependencies || await hasAnyConfig(dir, ["next.config.js", "next.config.mjs", "next.config.ts"])) {
    frameworks.add("next");
  }

  if ("vite" in dependencies || await hasAnyConfig(dir, ["vite.config.js", "vite.config.mjs", "vite.config.ts", "vite.config.mts"])) {
    frameworks.add("vite");
  }

  if ("turbo" in dependencies || await exists(path.join(root, "turbo.json")) || await exists(path.join(dir, "turbo.json"))) {
    frameworks.add("turbo");
  }

  if (await exists(path.join(root, ".github", "workflows"))) {
    frameworks.add("github-actions");
  }

  return [...frameworks];
}

async function hasAnyConfig(dir: string, names: string[]): Promise<boolean> {
  for (const name of names) {
    if (await exists(path.join(dir, name))) {
      return true;
    }
  }

  return false;
}

export async function readPackages(root: string): Promise<{ packages: PackageInfo[]; rootPackage: PackageInfo | undefined; packageManager: string }> {
  const rootPackagePath = path.join(root, "package.json");
  const rootJson = await readJsonFile<PackageJson>(rootPackagePath);
  const patterns = workspacePatterns(rootJson);
  const packagePatterns = patterns.length > 0
    ? patterns.map((pattern) => `${pattern.replace(/\/$/, "")}/package.json`)
    : ["apps/*/package.json", "packages/*/package.json"];

  const entries = new Set<string>(["package.json"]);
  const found = await fg(packagePatterns, {
    cwd: root,
    absolute: false,
    dot: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"]
  });

  for (const file of found) {
    entries.add(file);
  }

  const packages: PackageInfo[] = [];

  for (const entry of [...entries].sort()) {
    const filePath = path.join(root, entry);
    const packageJson = await readJsonFile<PackageJson>(filePath);

    if (!packageJson) {
      continue;
    }

    const dir = path.dirname(filePath);
    packages.push({
      dir,
      relativeDir: relativePath(root, dir),
      name: packageJson.name ?? (entry === "package.json" ? "root" : path.basename(dir)),
      scripts: stringRecord(packageJson.scripts),
      dependencies: stringRecord(packageJson.dependencies),
      devDependencies: stringRecord(packageJson.devDependencies),
      frameworks: await detectFrameworks(root, dir, packageJson)
    });
  }

  const rootPackage = packages.find((workspacePackage) => workspacePackage.dir === root);
  return {
    packages,
    rootPackage,
    packageManager: await detectPackageManager(root, asRecord(rootJson).packageManager)
  };
}

async function detectPackageManager(root: string, declared: unknown): Promise<string> {
  if (typeof declared === "string" && declared.length > 0) {
    return declared;
  }

  const candidates: Array<[string, string]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"]
  ];

  for (const [file, manager] of candidates) {
    if (await exists(path.join(root, file))) {
      return manager;
    }
  }

  return "npm";
}
