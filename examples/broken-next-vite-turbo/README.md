# Broken Next + Vite + Turbo Demo

This fixture intentionally contains environment-variable mistakes so EnvDoctor has something realistic to diagnose.

From the repository root:

```bash
node packages/cli/dist/index.js doctor --cwd examples/broken-next-vite-turbo
node packages/cli/dist/index.js doctor --cwd examples/broken-next-vite-turbo --format sarif --output envdoctor.sarif
node packages/cli/dist/index.js ci --cwd examples/broken-next-vite-turbo --github-annotations
```

Expected highlights:

- `DATABASE_URL` is used but missing from `.env.example`.
- `VITE_STRIPE_SECRET_KEY` looks secret-like and would be exposed to a Vite client bundle.
- `API_URL` is read from `import.meta.env` without the default `VITE_` prefix.
- `APP_PORT` is read in `vite.config.ts` before Vite loads mode-specific `.env` files.
- `DATABASE_URL` is used during a Turbo build but missing from `turbo.json`.
- `.github/workflows/deploy.yml` references an undocumented `secrets.STRIPE_SECRET`.
