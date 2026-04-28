import path from "node:path";
import { readJsonFile, asRecord, stringArray } from "../utils/json.js";
import { relativePath } from "../utils/path.js";
import type { TurboInfo, TurboTaskInfo } from "../types.js";

export async function readTurboJson(root: string): Promise<TurboInfo | undefined> {
  const filePath = path.join(root, "turbo.json");
  const turboJson = await readJsonFile<unknown>(filePath);

  if (!turboJson) {
    return undefined;
  }

  const record = asRecord(turboJson);
  const tasksRecord = asRecord(record.tasks ?? record.pipeline);
  const tasks: Record<string, TurboTaskInfo> = {};

  for (const [taskName, rawTask] of Object.entries(tasksRecord)) {
    const task = asRecord(rawTask);
    tasks[taskName] = {
      env: stringArray(task.env),
      passThroughEnv: stringArray(task.passThroughEnv)
    };
  }

  return {
    path: filePath,
    relativePath: relativePath(root, filePath),
    globalEnv: stringArray(record.globalEnv),
    globalPassThroughEnv: stringArray(record.globalPassThroughEnv),
    tasks
  };
}
