import path from "node:path";

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export function relativePath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath);
  return toPosixPath(relative || ".");
}

export function isSubPath(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function normalizeRoot(root: string): string {
  return path.resolve(root);
}
