import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import type { GeneratedFile } from "@envdoctor/core";

export async function writeGeneratedFile(file: GeneratedFile): Promise<void> {
  await mkdir(path.dirname(file.path), { recursive: true });
  await writeFile(file.path, file.contents, "utf8");
}

export async function printOrWrite(files: Array<GeneratedFile | undefined>, write: boolean): Promise<void> {
  const concreteFiles = files.filter((file): file is GeneratedFile => Boolean(file));

  if (concreteFiles.length === 0) {
    console.log(pc.green("No generated changes needed."));
    return;
  }

  for (const file of concreteFiles) {
    if (write) {
      await writeGeneratedFile(file);
      console.log(`${pc.green("wrote")} ${file.path}`);
    } else {
      console.log(`${pc.bold(file.path)}\n`);
      console.log(file.contents);
    }
  }
}
