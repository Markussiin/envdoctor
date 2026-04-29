# EnvDoctor v0.1.0 Marketplace Release

Use these values when publishing the first GitHub Marketplace release.

## Release settings

- Tag: `v0.1.0`
- Moving major tag for users: `v0`
- Release title: `EnvDoctor v0.1.0 - SARIF env diagnostics for JavaScript repos`
- Primary category: `Code Quality`
- Secondary category: `Security`

## Release notes

EnvDoctor is a static analyzer and CI guard for environment-variable bugs in modern JavaScript and TypeScript repositories.

This first Marketplace release adds:

- AST-based detection for `process.env`, `import.meta.env`, `Deno.env`, `Bun.env`, and common config-service lookups.
- Framework-aware diagnostics for Vite, Next.js, Turborepo, Node `--env-file`, GitHub Actions, and monorepos.
- Critical CI failures for undocumented required variables, public secret leaks, and Turborepo Strict Mode drift.
- GitHub Actions annotations for pull requests.
- SARIF 2.1.0 output for GitHub Code Scanning.
- Safe generators for `.env.example`, Zod schemas, Vite env types, Turborepo env patch files, and EnvDoctor workflows.

Recommended workflow usage:

```yaml
- uses: Markussiin/envdoctor@v0
  with:
    fail-on: high
    sarif: "true"
    sarif-file: envdoctor.sarif
```

The Action runs locally in the caller's workflow workspace and does not upload environment values or secrets anywhere.
