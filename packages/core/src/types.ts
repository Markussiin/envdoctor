export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type FrameworkId = "node" | "next" | "vite" | "turbo" | "github-actions";

export type EnvSource =
  | "process.env"
  | "import.meta.env"
  | "Deno.env.get"
  | "Bun.env"
  | "configService.get";

export type EnvAccessKind = "member" | "computed" | "destructure" | "call";

export interface SourceLocation {
  filePath: string;
  relativePath: string;
  line: number;
  column: number;
}

export interface EnvUsage extends SourceLocation {
  key: string;
  source: EnvSource;
  accessKind: EnvAccessKind;
  packageDir: string;
  packageName?: string;
  isConfigFile: boolean;
  isClientFile: boolean;
}

export interface DynamicEnvUsage extends SourceLocation {
  source: EnvSource;
  reason: string;
}

export interface PackageInfo {
  dir: string;
  relativeDir: string;
  name: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  frameworks: FrameworkId[];
}

export interface EnvFileInfo {
  path: string;
  relativePath: string;
  kind: string;
  keys: string[];
  values: Record<string, string>;
}

export interface TurboTaskInfo {
  env: string[];
  passThroughEnv: string[];
}

export interface TurboInfo {
  path: string;
  relativePath: string;
  globalEnv: string[];
  globalPassThroughEnv: string[];
  tasks: Record<string, TurboTaskInfo>;
}

export type WorkflowReferenceKind = "secrets" | "vars" | "env";

export interface WorkflowReference extends SourceLocation {
  kind: WorkflowReferenceKind;
  key: string;
}

export interface ProjectContext {
  root: string;
  packageManager: string;
  rootPackage: PackageInfo | undefined;
  packages: PackageInfo[];
  envFiles: EnvFileInfo[];
  exampleKeys: Set<string>;
  schemaKeys: Set<string>;
  turbo: TurboInfo | undefined;
  workflowReferences: WorkflowReference[];
  frameworks: Set<FrameworkId>;
}

export interface Diagnostic extends SourceLocation {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  fix?: string;
  framework?: FrameworkId;
  key?: string;
}

export interface AnalysisResult {
  context: ProjectContext;
  usages: EnvUsage[];
  dynamicUsages: DynamicEnvUsage[];
  diagnostics: Diagnostic[];
}

export interface AnalyzeOptions {
  include?: string[];
  ignore?: string[];
}

export interface GenerateExampleOptions {
  includeComments?: boolean;
}

export interface GeneratedFile {
  path: string;
  contents: string;
  changed: boolean;
}
