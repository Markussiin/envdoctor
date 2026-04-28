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

  it("ships a GitHub Action wrapper", async () => {
    const actionPath = path.resolve(import.meta.dirname, "..", "..", "..", "action.yml");
    const action = await readFile(actionPath, "utf8");

    assert.equal(action.includes("using: composite"), true);
    assert.equal(action.includes("doctor --cwd \"$ENVDOCTOR_CWD\" --format sarif"), true);
    assert.equal(action.includes("ci --cwd \"$ENVDOCTOR_CWD\" --fail-on \"$ENVDOCTOR_FAIL_ON\" --github-annotations"), true);
  });
});
