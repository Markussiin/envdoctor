# Contributing

EnvDoctor is organized as an npm workspace:

- `packages/core` contains repository readers, AST scanning, rules, reporters, and generators.
- `packages/cli` contains the command-line interface.

Before opening a change, run:

```bash
npm run typecheck
npm test
npm run build
```

Rule changes should include a fixture-style test in `packages/core/test`. Keep diagnostics actionable: each issue should include the key, location, why it breaks, and a concrete fix.
