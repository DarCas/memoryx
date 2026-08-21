# AGENTS.md

## What this is

`@darcas/memoryx` — a tiny npm library implementing a namespaced in-memory key-value store backed by `window._oOMemoryXOo_`. Two source files: `src/index.ts` (public `MemoryX` class) and `src/utils.ts` (internal lodash-compatible path engine). No app, no server, no monorepo.

## Commands

- Build: `npm run build` (wipes `dist/`, esbuild-bundles `src/index.ts` + `src/utils.ts` into a single ESM `dist/index.js` at target es2015, emits `.d.ts` via `tsc --emitDeclarationOnly`, then terser-minifies to `dist/index.min.js` and deletes the unminified bundle)
- Tests: `npm test` (Vitest, config in `vitest.config.ts`, suite in `tests/`). happy-dom env by default; SSR tests use the `// @vitest-environment node` pragma.
- No lint scripts. `tsc --noEmit` is the typecheck. Run order before release: `tsc --noEmit` → `npm test` → `npm run build`.

## Publishing (do NOT run manually)

Publishing is automated via GitHub Actions (`.github/workflows/publish.yml`): pushing a tag matching `v*` triggers `npm run deploy` (build + `npm publish`). To release: bump `version` in `package.json`, commit, create tag `vX.Y.Z`, push with tags.

## Gotchas

- The global storage key is the obfuscated `window._oOMemoryXOo_` (declared via `declare global` in src/index.ts). Do not rename — instances across bundles must share it. Root falls back to `globalThis` when `window` is absent (SSR).
- The path engine in `src/index.ts` is a hand-ported lodash replacement (`get/set/has/unset` semantics, including sparse-array `has()` and array-vs-object intermediate creation). `tests/path-engine.test.ts` runs differential tests against real lodash — if a path case diverges, that test fails. Do not "simplify" the engine without updating those tests.
- Writing to `__proto__`/`constructor`/`prototype` paths aborts the whole operation (no traversal past the forbidden key) — this intentionally diverges from lodash and guards against prototype pollution.
- `package.json` has zero runtime dependencies; lodash is a devDependency used only by the parity tests. Keep it that way.
- `package.json` `main` points to `dist/index.min.js`, but esbuild emits `dist/index.js` first; the minify step swaps them. If you change the build, keep this contract intact.
- Target is ES2015 (esbuild dropped ES5 transform) with `lib: ["es2015", "dom"]`; strict mode on. `package.json` has `"type": "module"` — the published artifact is ESM-only.
- `.nvmrc` pins Node 22 (CI publishes on Node 24).

## Behavioral contracts (do not change silently)

- Notifications are synchronous, one per mutation, no batching/debounce — documented as a deliberate limitation in README ("Behavior notes and limitations"). Any async/batching feature must stay opt-in.
- `get()` returns the default only when the resolved value is `undefined`; storing `undefined` makes a path invisible to `get()` but visible to `has()`.
- `all()`/`snapshot()` are shallow/JSON: deep values are by reference; non-JSON values degrade. Documented in README.
- Listener exceptions propagate to the mutation caller (documented).

## Conventions

- Commits: Conventional Commits with leading emoji (`✨ feat`, `🐛 fix`, ...) and a structured body (`### Added/Changed/Removed/Refactored`). Full spec in `.opencode/commands/commit.md`; use `/commit` in OpenCode.
- Never commit or publish without explicit user request.
- README.md documents the public API — update it whenever the API changes.
