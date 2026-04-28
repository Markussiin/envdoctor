import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

describe("package metadata", () => {
  it("uses a publishable core dependency instead of a local file dependency", async () => {
    const packageJsonPath = path.resolve(import.meta.dirname, "..", "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };

    assert.equal(packageJson.dependencies?.["@envdoctor/core"], "0.1.0");
  });
});
