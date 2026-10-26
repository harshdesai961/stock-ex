# CLAUDE.md: stock-ex conventions for Claude Code

Shared by both developers (CLI and Desktop app). Change it only through a pull request.
The product spec is `docs/PROJECT_SPEC.md`; it wins over every other document.

## Commands (run from the repo root)

| Command | Use |
|---|---|
| `pnpm bootstrap` | Full idempotent setup: checks tools, creates/upgrades `.env`, starts Docker, installs, builds packages, DB roles, migrate, seed |
| `pnpm healthcheck` | Pass/fail checklist of the local setup; run first when something is broken |
| `pnpm dev` | Web :3000, server :4000, package watchers (worker only if `FEATURE_AI=true`) |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Must all pass before a PR (zero lint warnings) |
| `pnpm --filter @stock-ex/server test:integration` | Server tests against real Postgres + Redis |
| `pnpm test:e2e` | Playwright + axe (builds and starts the web app) |
| `pnpm db:generate` / `pnpm db:migrate` | Create / apply Drizzle migrations |
| `pnpm db:reset` | Wipe and rebuild the **local** DB (refuses non-localhost) |
| `pnpm sim -- --games 1000` | Bot-vs-bot engine simulations (M1) |

Scripts must work from PowerShell, bash and the Desktop app (which may not load the shell profile): write Node scripts, not shell scripts.

## Layout

`apps/web` (Next.js 16, App Router) · `apps/server` (NestJS 12 + Socket.IO) · `apps/ai-worker` (M6) · `packages/engine` (pure rules) · `packages/shared` (Zod schemas, env, socket contracts) · `packages/db` (Drizzle) · `packages/config` (tsconfig/eslint/prettier/tailwind presets). Packages build to `dist/` with `tsc`; apps consume the built output (`turbo` builds dependencies first).

## Architecture rules

- **The server is authoritative.** Clients send intents; the server validates (Zod), authorizes, applies via the engine, broadcasts. Clients never compute outcomes.
- **Identity comes only from the verified session / socket token**, never from a message payload.
- **`projectForPlayer` is the only way game state leaves the server.** Never send raw `GameState`, hands, deck order or the seed before Game Over.
- **The engine is pure and deterministic:** no I/O, no framework imports, no `Math.random`, no `Date.now`, no `process`. ESLint enforces this in `packages/engine`. Seeds come from the server (`node:crypto`).
- **Money is integer rupees; quantities are multiples of 1,000.** Never floats. Format with `Intl.NumberFormat('en-IN')`.
- **Game rules live in `docs/PROJECT_SPEC.md` §4** plus the confirmed interpretations in `docs/rules/rules.md`. Never change a rule silently; ask.

## Conventions

- TypeScript strict everywhere (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESM, `.js` extensions in relative imports.
- Validate every external input with Zod at the boundary (env, socket events, REST bodies, job payloads, LLM output).
- NestJS: inject with explicit tokens (`@Inject(Foo)`), so DI does not depend on emitted metadata.
- Conventional Commits with the package as scope: `feat(engine): …`, `fix(server): …`. Small PRs (≲ 400 lines), one approving review, squash merge.
- New dependency → check it's real, maintained, widely used, licence OK; add a row to `docs/DECISIONS.md`.
- New env variable → `.env.example` + `packages/shared/src/env/schema.ts` + `docs/DEVELOPMENT.md`, same PR.
- New personal-data field → `docs/DATA_INVENTORY.md`. New entry point or trust boundary → `docs/THREAT_MODEL.md`.
- After each milestone: append plain-language explanations to `docs/LEARNING.md`.

## Security rules for Claude

- **Never read, print or edit `.env` or any real secret.** Use `.env.example` for variable names. (Deny rules in `.claude/settings.json` enforce this.)
- Never commit secrets; gitleaks blocks it in pre-commit and CI. Never bypass hooks (`--no-verify`).
- No `dangerouslySetInnerHTML`, no string-built SQL, no fetching user-supplied URLs.
- Logs go through pino with redaction; never log tokens, passwords, emails or full request bodies.
- Don't add or remove Claude Code plugins; the team installs them (docs/DEVELOPMENT.md §8.2).
- Don't push, open PRs, change GitHub settings or deploy unless a developer asks in the conversation.
