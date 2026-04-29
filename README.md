# EnvDoctor

Diagnose missing, leaked, stale, and misconfigured environment variables in Node.js, Next.js, Vite, Turborepo, and CI.

EnvDoctor is a static analyzer and CI guard for the messy env-variable layer in modern JavaScript repositories. It scans source code with an AST, compares discovered keys with `.env*`, `.env.example`, env schemas, framework rules, monorepo config, and GitHub Actions workflows, then explains what will break and how to fix it.

```bash
npx envdoctor doctor
```

```txt
EnvDoctor found 5 issues.

CRITICAL  DATABASE_URL is used but not documented
          apps/api/src/db.ts:8:19
          DATABASE_URL is referenced in code but is missing from .env.example and known env schema files.
          Fix: Add DATABASE_URL= to .env.example or define it in env.schema.ts.

HIGH      VITE_STRIPE_SECRET_KEY may expose a secret
          apps/web/src/billing.ts:3:12
          VITE_STRIPE_SECRET_KEY looks sensitive and is named like a browser-exposed environment variable.
          Fix: Move the secret to a server-only variable and expose only a non-sensitive public value.

MEDIUM    Vite config reads process.env.APP_PORT
          apps/web/vite.config.ts:12:32
          process.env.APP_PORT is read while evaluating vite.config, before Vite loads .env files for the selected mode.
          Fix: Use loadEnv(mode, process.cwd(), "") inside defineConfig.
```

## Why this exists

Env variables fail in places that plain validators do not see:

- local `.env` works, CI does not
- Vite client code sees `undefined` because a variable is not `VITE_*`
- a secret accidentally uses `VITE_*` or `NEXT_PUBLIC_*`
- Vite config reads `process.env` before `.env*` has been loaded
- Turborepo Strict Mode filters CI-provided variables from package builds
- `.env.example` drifts away from real code and workflow secrets

## What it scans

Static JS/TS usage:

```ts
process.env.DATABASE_URL;
process.env["DATABASE_URL"];
const { DATABASE_URL } = process.env;
import.meta.env.VITE_API_URL;
Deno.env.get("KEY");
Bun.env.KEY;
configService.get("KEY");
```

Repository context:

- `.env`, `.env.local`, `.env.example`, `.env.production`, `.env.test`
- `.envdoctorignore` for source files or fixtures you intentionally do not want scanned
- package workspaces and package manager
- Next.js, Vite, Turborepo, and GitHub Actions detection
- `turbo.json` `tasks`, `pipeline`, `globalEnv`, and passthrough env config
- workflow references to `${{ secrets.KEY }}`, `${{ vars.KEY }}`, and `${{ env.KEY }}`

## Commands

```bash
envdoctor                # same as doctor
envdoctor scan           # list discovered env references
envdoctor doctor         # run diagnostics
envdoctor ci             # fail on high/critical diagnostics
envdoctor fix --write    # update .env.example and emit safe patch files
envdoctor generate example --write
envdoctor generate schema --target zod --write
envdoctor generate vite-types --write
envdoctor generate workflow --write
```

Every reporting command supports:

```bash
envdoctor doctor --json
envdoctor doctor --format sarif --output envdoctor.sarif
envdoctor doctor --cwd ./apps/web
envdoctor ci --github-annotations
```

## SARIF and Code Scanning

EnvDoctor can emit SARIF 2.1.0 so findings show up in GitHub Code Scanning.

```bash
envdoctor doctor --format sarif --output envdoctor.sarif
```

Generated SARIF includes rule metadata, severity mapping, source locations, stable fingerprints, and suggested fixes. Use it with GitHub's SARIF upload action:

```yaml
- run: npx envdoctor doctor --format sarif --output envdoctor.sarif
- uses: github/codeql-action/upload-sarif@v4
  if: always()
  with:
    sarif_file: envdoctor.sarif
    category: envdoctor
- run: npx envdoctor ci --github-annotations
```

## First diagnostics

| Rule | Severity | Why it matters |
| --- | --- | --- |
| `missing-from-example` | critical | code uses a key that is not in `.env.example` or known schema files |
| `public-secret-leak` | high | `VITE_*`, `NEXT_PUBLIC_*`, or other public names look secret-like |
| `vite-prefix` | high | `import.meta.env.FOO` is not exposed by Vite's default client prefix |
| `vite-config-process-env` | medium | `vite.config.*` reads `process.env` before Vite loads `.env*` |
| `turbo-strict-mode` | high/medium | Turborepo tasks use keys missing from `env`/`globalEnv` or passthrough config |
| `github-actions-undocumented-env` | high | workflows reference secrets or vars missing from env docs/schema |
| `node-env-file-missing` | medium | Node `--env-file` points at a missing file |
| `vite-build-time-env` / `next-public-build-time` | low | public frontend env values are frozen at build time |

## Generated files

`envdoctor fix --write` updates `.env.example` and emits `turbo.env.patch.json` when Turborepo declarations are missing.

Specific generators are also available:

- `.env.example`
- `env.schema.ts` using Zod
- `vite-env.d.ts`
- `.github/workflows/envdoctor.yml`

Example generated schema:

```ts
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

## GitHub Action

Use the Marketplace wrapper action when you want GitHub annotations and an optional SARIF file from one step. Pin to the moving major tag for updates inside the same release line:

```yaml
name: EnvDoctor

on:
  pull_request:

jobs:
  envdoctor:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - uses: Markussiin/envdoctor@v0
        id: envdoctor
        with:
          fail-on: high
          sarif: "true"
          sarif-file: envdoctor.sarif
      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: envdoctor.sarif
          category: envdoctor
```

The generated workflow uses the same code-scanning pattern:

```bash
envdoctor generate workflow --write
```

## Demo

This repo includes a deliberately broken fixture:

```bash
npm run build
node packages/cli/dist/index.js doctor --cwd examples/broken-next-vite-turbo
node packages/cli/dist/index.js doctor --cwd examples/broken-next-vite-turbo --format sarif --output envdoctor.sarif
node packages/cli/dist/index.js ci --cwd examples/broken-next-vite-turbo --github-annotations
```

It demonstrates Vite prefix mistakes, public secret leaks, Next.js client env misuse, Turborepo Strict Mode drift, missing `.env.example` keys, missing Node `--env-file`, and GitHub Actions secret documentation gaps.

## Rule sources

EnvDoctor's first rule set follows current official behavior documented by:

- Node.js CLI docs for `--env-file` and `--env-file-if-exists`: https://nodejs.org/dist/latest/docs/api/cli.html
- Vite env docs for `import.meta.env`, `VITE_*`, string values, and client bundling: https://vite.dev/guide/env-and-mode/
- Vite config docs for manual `loadEnv` in `vite.config.*`: https://vite.dev/config/
- Next.js env docs for `NEXT_PUBLIC_*`, build-time inlining, and load order: https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables
- Turborepo env docs for Strict Mode and CI vendor variable filtering: https://turborepo.com/repo/docs/crafting-your-repository/using-environment-variables

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
node packages/cli/dist/index.js doctor --cwd examples/broken-next-vite-turbo
```

## Status

This is an MVP focused on high-signal static diagnostics and conservative file generation. It intentionally does not manage secrets, encrypt `.env` files, or provide hosted configuration storage.
