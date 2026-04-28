import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
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

    assert.deepEqual(keys, [
      "BUN_KEY",
      "DATABASE_URL",
      "DENO_KEY",
      "NEST_KEY",
      "NEXT_PUBLIC_SITE_URL",
      "VITE_API_URL"
    ]);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.id === "missing-from-example" && diagnostic.key === "DATABASE_URL"), true);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.id === "turbo-strict-mode" && diagnostic.key === "DATABASE_URL"), true);
  });

  it("handles TypeScript computed env keys and reports dynamic accesses", async () => {
    const root = await fixtureRoot();
    await writeJson(path.join(root, "package.json"), { name: "fixture" });
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "index.ts"), [
      "const staticKey = process.env[\"STATIC_KEY\" as const];",
      "const dynamicKey = \"DYNAMIC_KEY\";",
      "const dynamicValue = process.env[dynamicKey];"
    ].join("\n"), "utf8");

    const result = await analyzeProject(root);

    assert.equal(result.usages.some((usage) => usage.key === "STATIC_KEY"), true);
    assert.equal(result.dynamicUsages.some((usage) => usage.source === "process.env"), true);
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

    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.id === "vite-config-process-env" && diagnostic.key === "APP_PORT"), true);
  });

  it("accepts BOM-prefixed package.json files", async () => {
    const root = await fixtureRoot();
    await writeFile(path.join(root, "package.json"), `\uFEFF${JSON.stringify({
      name: "fixture",
      dependencies: {
        vite: "latest"
      }
    })}\n`, "utf8");
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "index.ts"), "import.meta.env.API_URL;\n", "utf8");

    const result = await analyzeProject(root);

    assert.equal(result.context.frameworks.has("vite"), true);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.id === "vite-prefix" && diagnostic.key === "API_URL"), true);
  });

  it("reports framework-specific diagnostics in a monorepo fixture", async () => {
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
          env: ["NEXT_PUBLIC_SITE_URL"]
        }
      }
    });
    await mkdir(path.join(root, ".github", "workflows"), { recursive: true });
    await writeFile(path.join(root, ".github", "workflows", "env.yml"), [
      "name: Env",
      "on: [push]",
      "jobs:",
      "  test:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - run: echo ${{ secrets.STRIPE_SECRET }}",
      "      - run: echo ${{ secrets.GITHUB_TOKEN }}"
    ].join("\n"), "utf8");
    await mkdir(path.join(root, "apps", "web", "src"), { recursive: true });
    await writeJson(path.join(root, "apps", "web", "package.json"), {
      name: "web",
      scripts: {
        build: "vite build && next build",
        start: "node --env-file=.env.optional server.js"
      },
      dependencies: {
        next: "latest",
        vite: "latest"
      }
    });
    await writeFile(path.join(root, ".env.example"), "NEXT_PUBLIC_SITE_URL=\n", "utf8");
    await writeFile(path.join(root, "apps", "web", "vite.config.ts"), [
      "import { defineConfig } from \"vite\";",
      "export default defineConfig({ server: { port: Number(process.env.APP_PORT) } });"
    ].join("\n"), "utf8");
    await writeFile(path.join(root, "apps", "web", "src", "client.tsx"), [
      "\"use client\";",
      "process.env.SERVER_SECRET;",
      "process.env.NEXT_PUBLIC_TOKEN;",
      "import.meta.env.API_URL;",
      "import.meta.env.VITE_STRIPE_SECRET_KEY;",
      "process.env.DATABASE_URL;"
    ].join("\n"), "utf8");

    const result = await analyzeProject(root);
    const hasDiagnostic = (id: string, key?: string): boolean =>
      result.diagnostics.some((diagnostic) => diagnostic.id === id && (!key || diagnostic.key === key));

    assert.equal(hasDiagnostic("vite-prefix", "API_URL"), true);
    assert.equal(hasDiagnostic("vite-config-process-env", "APP_PORT"), true);
    assert.equal(hasDiagnostic("public-secret-leak", "VITE_STRIPE_SECRET_KEY"), true);
    assert.equal(hasDiagnostic("next-client-private-env", "SERVER_SECRET"), true);
    assert.equal(hasDiagnostic("next-public-secret", "NEXT_PUBLIC_TOKEN"), true);
    assert.equal(hasDiagnostic("turbo-strict-mode", "DATABASE_URL"), true);
    assert.equal(hasDiagnostic("github-actions-undocumented-env", "STRIPE_SECRET"), true);
    assert.equal(hasDiagnostic("github-actions-undocumented-env", "GITHUB_TOKEN"), false);
    assert.equal(hasDiagnostic("node-env-file-missing"), true);
  });

  it("generates .env.example from usage and env files", async () => {
    const root = await fixtureRoot();
    await writeJson(path.join(root, "package.json"), { name: "fixture" });
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "src", "index.ts"), "process.env.DATABASE_URL;\n", "utf8");
    await writeFile(path.join(root, ".env.production"), "NEXT_PUBLIC_SITE_URL=https://example.com\n", "utf8");

    const result = await analyzeProject(root);
    const generated = await generateExample(result);

    assert.equal(generated.contents.includes("DATABASE_URL="), true);
    assert.equal(generated.contents.includes("NEXT_PUBLIC_SITE_URL="), true);
  });

  it("preserves existing .env.example content and appends missing keys", async () => {
    const root = await fixtureRoot();
    await writeJson(path.join(root, "package.json"), { name: "fixture" });
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, ".env.example"), [
      "# Database",
      "DATABASE_URL="
    ].join("\n"), "utf8");
    await writeFile(path.join(root, "src", "index.ts"), [
      "process.env.DATABASE_URL;",
      "process.env.REDIS_URL;"
    ].join("\n"), "utf8");

    const result = await analyzeProject(root);
    const generated = await generateExample(result);

    assert.equal(generated.contents, [
      "# Database",
      "DATABASE_URL=",
      "",
      "# Added by EnvDoctor.",
      "REDIS_URL=",
      ""
    ].join("\n"));
  });
});

async function fixtureRoot(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "envdoctor-"));
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
