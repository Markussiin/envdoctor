import path from "node:path";
import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import type { DynamicEnvUsage, EnvAccessKind, EnvSource, EnvUsage, PackageInfo } from "../types.js";
import { isSubPath, relativePath } from "../utils/path.js";
import { DEFAULT_IGNORE_PATTERNS, findCodeFiles } from "./files.js";

interface ScanResult {
  usages: EnvUsage[];
  dynamicUsages: DynamicEnvUsage[];
}

interface VisitContext {
  root: string;
  filePath: string;
  relativePath: string;
  packageInfo: PackageInfo;
  isConfigFile: boolean;
  isClientFile: boolean;
  usages: EnvUsage[];
  dynamicUsages: DynamicEnvUsage[];
}

export async function scanEnvUsages(root: string, packages: PackageInfo[], include?: string[], ignore?: string[]): Promise<ScanResult> {
  const ignorePatterns = ignore ? [...DEFAULT_IGNORE_PATTERNS, ...ignore] : DEFAULT_IGNORE_PATTERNS;
  const files = await findCodeFiles(root, include, ignorePatterns);
  const usages: EnvUsage[] = [];
  const dynamicUsages: DynamicEnvUsage[] = [];

  for (const filePath of files.sort()) {
    const contents = await readFile(filePath, "utf8");
    const packageInfo = findOwningPackage(filePath, packages, root);
    const context: VisitContext = {
      root,
      filePath,
      relativePath: relativePath(root, filePath),
      packageInfo,
      isConfigFile: isConfigFile(filePath),
      isClientFile: isClientFile(filePath, contents),
      usages,
      dynamicUsages
    };

    const ast = parseSource(contents, filePath);
    visit(ast, undefined, context);
  }

  return { usages: dedupeUsages(usages), dynamicUsages };
}

function parseSource(contents: string, filePath: string): unknown {
  const extension = path.extname(filePath);
  const plugins = [
    "typescript",
    "decorators-legacy",
    "classProperties",
    "classPrivateProperties",
    "dynamicImport",
    "importAttributes"
  ] as const;
  const baseOptions = {
    sourceType: "unambiguous" as const,
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    plugins: extension === ".jsx" || extension === ".tsx"
      ? [...plugins, "jsx" as const]
      : [...plugins]
  };

  try {
    return parse(contents, baseOptions);
  } catch {
    return parse(contents, {
      ...baseOptions,
      plugins: [...plugins, "jsx"]
    });
  }
}

function visit(node: unknown, parent: unknown, context: VisitContext): void {
  if (!isNode(node)) {
    return;
  }

  inspectNode(node, parent, context);

  for (const [key, value] of Object.entries(node)) {
    if (shouldSkipKey(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, node, context);
      }
    } else {
      visit(value, node, context);
    }
  }
}

function inspectNode(node: Record<string, unknown>, parent: unknown, context: VisitContext): void {
  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    inspectMemberExpression(node, context);
  }

  if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
    inspectCallExpression(node, context);
  }

  if (node.type === "VariableDeclarator") {
    inspectDestructure(node, parent, context);
  }
}

function inspectMemberExpression(node: Record<string, unknown>, context: VisitContext): void {
  const source = memberSource(node);

  if (!source) {
    return;
  }

  const key = propertyName(node);

  if (key) {
    addUsage(context, node, key, source, computed(node) ? "computed" : "member");
    return;
  }

  addDynamicUsage(context, node, source, "computed property is not a string literal");
}

function inspectCallExpression(node: Record<string, unknown>, context: VisitContext): void {
  const callee = node.callee;
  const args = Array.isArray(node.arguments) ? node.arguments : [];
  const firstArg = args[0];

  if (isDenoEnvGet(callee)) {
    const key = literalString(firstArg);

    if (key) {
      addUsage(context, node, key, "Deno.env.get", "call");
    } else {
      addDynamicUsage(context, node, "Deno.env.get", "argument is not a string literal");
    }
  }

  if (isConfigServiceGet(callee)) {
    const key = literalString(firstArg);

    if (key) {
      addUsage(context, node, key, "configService.get", "call");
    } else {
      addDynamicUsage(context, node, "configService.get", "argument is not a string literal");
    }
  }
}

function inspectDestructure(node: Record<string, unknown>, _parent: unknown, context: VisitContext): void {
  const id = node.id;
  const init = node.init;
  const source = destructureSource(init);

  if (!source || !isRecord(id) || id.type !== "ObjectPattern" || !Array.isArray(id.properties)) {
    return;
  }

  for (const property of id.properties) {
    if (!isRecord(property)) {
      continue;
    }

    if (property.type === "ObjectProperty") {
      const key = patternPropertyName(property.key);

      if (key) {
        addUsage(context, property, key, source, "destructure");
      }
    }

    if (property.type === "RestElement") {
      addDynamicUsage(context, property, source, "rest destructuring cannot be resolved statically");
    }
  }
}

function memberSource(node: Record<string, unknown>): EnvSource | undefined {
  const object = node.object;

  if (isProcessEnv(object) || isImportMetaEnv(object) || isBunEnv(object)) {
    return sourceForEnvObject(object);
  }

  return undefined;
}

function destructureSource(node: unknown): EnvSource | undefined {
  if (isProcessEnv(node) || isImportMetaEnv(node) || isBunEnv(node)) {
    return sourceForEnvObject(node);
  }

  return undefined;
}

function sourceForEnvObject(node: unknown): EnvSource {
  if (isProcessEnv(node)) {
    return "process.env";
  }

  if (isImportMetaEnv(node)) {
    return "import.meta.env";
  }

  return "Bun.env";
}

function isProcessEnv(node: unknown): boolean {
  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    return false;
  }

  return identifierName(node.object) === "process" && propertyName(node) === "env";
}

function isImportMetaEnv(node: unknown): boolean {
  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    return false;
  }

  return isImportMeta(node.object) && propertyName(node) === "env";
}

function isBunEnv(node: unknown): boolean {
  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    return false;
  }

  return identifierName(node.object) === "Bun" && propertyName(node) === "env";
}

function isDenoEnvGet(node: unknown): boolean {
  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    return false;
  }

  return propertyName(node) === "get" && isDenoEnv(node.object);
}

function isDenoEnv(node: unknown): boolean {
  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    return false;
  }

  return identifierName(node.object) === "Deno" && propertyName(node) === "env";
}

function isConfigServiceGet(node: unknown): boolean {
  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    return false;
  }

  if (propertyName(node) !== "get") {
    return false;
  }

  const name = dottedName(node.object).toLowerCase();
  return /(^|\.)(config|configservice)$/.test(name) || name.includes("configservice");
}

function propertyName(node: Record<string, unknown>): string | undefined {
  const property = node.property;

  if (!computed(node)) {
    return identifierName(property);
  }

  return literalString(property);
}

function patternPropertyName(node: unknown): string | undefined {
  return identifierName(node) ?? literalString(node);
}

function literalString(node: unknown): string | undefined {
  if (!isRecord(node)) {
    return undefined;
  }

  if (isWrapperExpression(node)) {
    return literalString(node.expression);
  }

  if (node.type === "StringLiteral" && typeof node.value === "string") {
    return node.value;
  }

  if (node.type === "TemplateLiteral" && Array.isArray(node.expressions) && node.expressions.length === 0) {
    const quasis = Array.isArray(node.quasis) ? node.quasis : [];
    const first = quasis[0];
    if (isRecord(first) && isRecord(first.value) && typeof first.value.cooked === "string") {
      return first.value.cooked;
    }
  }

  return undefined;
}

function isWrapperExpression(node: Record<string, unknown>): boolean {
  return [
    "TSAsExpression",
    "TSSatisfiesExpression",
    "TSTypeAssertion",
    "TSNonNullExpression",
    "ParenthesizedExpression"
  ].includes(String(node.type)) && "expression" in node;
}

function identifierName(node: unknown): string | undefined {
  return isRecord(node) && node.type === "Identifier" && typeof node.name === "string"
    ? node.name
    : undefined;
}

function isImportMeta(node: unknown): boolean {
  if (!isRecord(node) || node.type !== "MetaProperty") {
    return false;
  }

  return identifierName(node.meta) === "import" && identifierName(node.property) === "meta";
}

function computed(node: Record<string, unknown>): boolean {
  return node.computed === true;
}

function addUsage(context: VisitContext, node: unknown, key: string, source: EnvSource, accessKind: EnvAccessKind): void {
  if (!key || key === "env") {
    return;
  }

  const location = locationForNode(node);
  context.usages.push({
    key,
    source,
    accessKind,
    filePath: context.filePath,
    relativePath: context.relativePath,
    line: location.line,
    column: location.column,
    packageDir: context.packageInfo.dir,
    packageName: context.packageInfo.name,
    isConfigFile: context.isConfigFile,
    isClientFile: context.isClientFile
  });
}

function addDynamicUsage(context: VisitContext, node: unknown, source: EnvSource, reason: string): void {
  const location = locationForNode(node);
  context.dynamicUsages.push({
    source,
    reason,
    filePath: context.filePath,
    relativePath: context.relativePath,
    line: location.line,
    column: location.column
  });
}

function locationForNode(node: unknown): { line: number; column: number } {
  if (isRecord(node) && isRecord(node.loc) && isRecord(node.loc.start)) {
    const line = typeof node.loc.start.line === "number" ? node.loc.start.line : 1;
    const column = typeof node.loc.start.column === "number" ? node.loc.start.column + 1 : 1;
    return { line, column };
  }

  return { line: 1, column: 1 };
}

function isNode(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.type === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function shouldSkipKey(key: string): boolean {
  return [
    "loc",
    "start",
    "end",
    "range",
    "leadingComments",
    "trailingComments",
    "innerComments",
    "extra",
    "errors"
  ].includes(key);
}

function dottedName(node: unknown): string {
  if (identifierName(node)) {
    return identifierName(node)!;
  }

  if (!isRecord(node) || (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression")) {
    if (isRecord(node) && node.type === "ThisExpression") {
      return "this";
    }

    return "";
  }

  const objectName = dottedName(node.object);
  const property = propertyName(node);
  return [objectName, property].filter(Boolean).join(".");
}

function findOwningPackage(filePath: string, packages: PackageInfo[], root: string): PackageInfo {
  const sorted = [...packages].sort((a, b) => b.dir.length - a.dir.length);
  const match = sorted.find((workspacePackage) => isSubPath(workspacePackage.dir, filePath));

  return match ?? {
    dir: root,
    relativeDir: ".",
    name: "root",
    scripts: {},
    dependencies: {},
    devDependencies: {},
    frameworks: ["node"]
  };
}

function isConfigFile(filePath: string): boolean {
  const base = path.basename(filePath);
  return /^(vite|next|nuxt|astro|svelte|webpack|rollup|eslint|vitest|jest)\.config\./.test(base);
}

function isClientFile(filePath: string, contents: string): boolean {
  const normalized = filePath.split(path.sep).join("/");

  if (/\.(client|browser)\.[cm]?[jt]sx?$/.test(normalized)) {
    return true;
  }

  if (/\.(server|node)\.[cm]?[jt]sx?$/.test(normalized)) {
    return false;
  }

  return /^\s*["']use client["'];?/m.test(contents);
}

function dedupeUsages(usages: EnvUsage[]): EnvUsage[] {
  const seen = new Set<string>();
  const unique: EnvUsage[] = [];

  for (const usage of usages) {
    const signature = [
      usage.key,
      usage.source,
      usage.relativePath,
      usage.line,
      usage.column
    ].join(":");

    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(usage);
    }
  }

  return unique;
}
