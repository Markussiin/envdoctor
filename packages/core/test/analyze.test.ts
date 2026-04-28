import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeProject, generateExample } from "../src/index.js";

describe("analyzeProject", () => {
  it("finds env references across supported JS/TS access patterns", async () => {
    const root = await fixtureRoot();
    await writeJson(path.join(root, "package.json"), {
      name: "fixture",
      private: true,
      workspaces: ["apps/*"],
      devDependencies: {
        turbo: "latest"
      }
    });
    await writeJson(path.join(root, "turbo.json"), {
      tasks: {
        build: {
          env: ["VITE_API_URL"]
        }
      }
    });
    await mkdir(path.join(root, "apps", "web", "src"), { recursive: true });
    await writeJson(path.join(root, "apps", "web", "package.json"), {
      name: "web",
      scripts: {
        build: "vite build"
      },
      dependencies: {
        vite: "latest"
      }
    });
    await writeFile(path.join(root, ".env.example"), "VITE_API_URL=\n", "utf8");
    await writeFile(path.join(root, "apps", "web", "src", "main.ts"), [
      "const api = import.meta.env.VITE_API_URL;",
      "const db = process.env.DATABASE_URL;",
      "const { NEXT_PUBLIC_SITE_URL } = process.env;",
      "const bun = Bun.env.BUN_KEY;",
      "const deno = Deno.env.get(\"DENO_KEY\");",
      "configService.get(\"NEST_KEY\");"
    ].join("\n"), "utf8");

    const result = await analyzeProject(root);
    const keys = result.usages.map((usage) => usage.key).sort();

    expect(keys).toEqual([
      "BUN_KEY",
      "DATABASE_URL",
      "DENO_KEY",
      "NEST_KEY",
      "NEXT_PUBLIC_SITE_URL",
      "VITE_API_URL"
    ]);
    expect(result.diagnostics.some((diagnostic) => diagnostic.id === "missing-from-example" && diagnostic.key === "DATABASE_URL")).toBe(true);
    expect(result.diagnostics.some((diagnostic) => diagnostic.id === "turbo-strict-mode" && diagnostic.key === "DATABASE_URL")).toBe(true);
  });

  it("reports Vite config process.env reads before loadEnv", async () => {
    const root = await fixtureRoot();
    await writeJson(path.join(root, "package.json"), {
      name: "fixture",
      devDependencies: {
        vite: "latest"
      }
    });
    await writeFile(path.join(root, ".env.example"), "APP_PORT=\n", "utf8");
    await writeFile(path.join(root, "vite.config.ts"), [
      "import { defineConfig } from \"vite\";",
      "export default defineConfig({",
      "  server: { port: Number(process.env.APP_PORT) }",
      "});"
    ].join("\n"), "utf8");

    const result = await analyzeProject(root);

    expect(result.diagnostics.some((diagnostic) => diagnostic.id === "vite-config-process-env" && diagnostic.key === "APP_PORT")).toBe(true);
  });

  it("generates .env.example from usage and env files", async () => {
    const root = await fixtureRoot();
    await writeJson(path.join(root, "package.json"), { name: "fixture" });
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "index.ts"), "process.env.DATABASE_URL;\n", "utf8");
    await writeFile(path.join(root, ".env.production"), "NEXT_PUBLIC_SITE_URL=https://example.com\n", "utf8");

    const result = await analyzeProject(root);
    const generated = await generateExample(result);

    expect(generated.contents).toContain("DATABASE_URL=");
    expect(generated.contents).toContain("NEXT_PUBLIC_SITE_URL=");
  });
});

async function fixtureRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "envdoctor-"));
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
