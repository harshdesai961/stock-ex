# Decisions (ADR log)

Short architecture decision records. Newest at the bottom. Each one: context → decision → consequences.

## ADR-0001: Versions pinned at project start (2026-10-26)

Exact versions are pinned in each `package.json` (no `^`), and the lockfile is committed. Dependabot proposes updates weekly.

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24.x (`.nvmrc`) | See ADR-0002 |
| pnpm | 12.15.0 | `packageManager` + `engines` + `engine-strict` |
| TypeScript | 6.0.3 | See ADR-0003 |
| Turborepo | 2.11.10 | |
| Next.js / React | 16.4.3 / 19.3.1 | App Router, `proxy.ts` |
| NestJS | 12.2.0 | ESM packages |
| @nestjs/throttler | 6.7.1 | |
| Tailwind CSS | 4.3.3 | CSS-first config |
| Zod | 4.6.7 | |
| Drizzle ORM / drizzle-kit | 0.45.4 / 0.31.11 | 1.0 is still beta |
| postgres (postgres.js) | 3.4.9 | DB driver |
| ioredis | 6.0.0 | |
| pino | 10.4.0 | |
| helmet | 8.3.0 | |
| ESLint / typescript-eslint | 10.13.0 / 8.72.0 | |
| Prettier | 3.9.10 | |
| Vitest | 5.0.5 | |
| Playwright / @axe-core/playwright | 1.64.1 / 4.14.0 | |
| Husky / lint-staged | 9.1.7 / 17.6.0 | |
| tsx | 4.23.15 | Runs TS scripts and the simulator |
| gitleaks | 8.30.1 | Installed per machine; CI downloads with checksum |

Chosen for later milestones (installed when first used): socket.io 4.8.4, @socket.io/redis-adapter 8.3.0, BullMQ 6.4.2, Better Auth 1.7.13, jose 6.2.13, fast-check 4.10.2, Motion 14.6.0, Zustand 5.0.16, TanStack Query 5.105.0, Lightweight Charts 5.2.1.

## ADR-0002: Stay on Node 24 for now (2026-10-26)

- **Context:** The spec pinned Node 26 (Active LTS from 28 Oct 2026). Both developers run Node 24 LTS today, and the repo's version file was misnamed (`nvmrc`).
- **Decision:** Rename it to `.nvmrc` and keep **Node 24**; `engines.node` is `>=24 <25`. The spec (§11.1) and DEVELOPMENT.md were updated in the same PR.
- **Consequences:** Node 24 is a supported LTS line. Moving to 26 later is a one-line change in `.nvmrc`/`engines`/Docker plus `@types/node`, done in its own PR once both machines and the hosts support it.

## ADR-0003: TypeScript 6.0, not 7.0 (2026-10-26)

- **Context:** TypeScript 7.0 (the Go-based compiler) is the latest release, but typescript-eslint 8.72 supports `typescript >=4.8.4 <6.1.0`, and we rely on type-aware lint rules.
- **Decision:** Pin TypeScript **6.0.3** everywhere.
- **Consequences:** Revisit when typescript-eslint supports 7.x (Dependabot will show it).

## ADR-0004: Monorepo shape and builds (2026-10-26)

- **Decision:** pnpm workspaces + Turborepo. Internal packages compile to `dist/` with plain `tsc` and expose `exports` with types; apps consume the build. All code is ESM (`"type": "module"`, NodeNext resolution); NestJS 12 itself ships as ESM.
- **Why:** Plain `tsc` output works the same in Next.js, NestJS, Vitest and Node scripts, with no bundler config per package. It is easy to explain and debug.
- **Consequence:** `pnpm dev` runs `tsc --watch` per package; Turbo builds dependencies before dependants.

## ADR-0005: One root `.env`, validated with Zod, loaded with Node's built-in loader

- **Decision:** `packages/shared/src/env` defines one Zod schema per app and a `loadRootEnv()` that uses `process.loadEnvFile` (Node ≥ 20.12) instead of the `dotenv` package. Real environment variables win over the file, so CI and hosting platforms inject values without a file.
- **Consequences:** One fewer dependency. Errors list variable *names* and problems, never values. `next.config.ts` validates at boot so a bad setting stops `next dev`/`next build`.

## ADR-0006: Two Postgres roles

- **Decision:** The Compose superuser (`POSTGRES_USER`) is the migration role (`DATABASE_MIGRATION_URL`). `pnpm bootstrap` creates an app role (`APP_DB_USER`) with only `SELECT/INSERT/UPDATE/DELETE` and default privileges for future tables (`DATABASE_URL`). `pnpm healthcheck` proves the app role cannot `CREATE` in the schema.
- **Why:** If the app is compromised, it cannot drop or alter tables (spec §7, OWASP A01/A08). Later, `game_events` gets INSERT/SELECT only, so append-only is enforced by grants, not by discipline.
- **How:** Role names and passwords are DDL identifiers/literals that can't be bound as parameters, so `ensure-roles.ts` asks Postgres to quote them with `format('%I', '%L')` instead of string concatenation.

## ADR-0007: Nonce-based CSP in Next.js

- **Decision:** `apps/web/proxy.ts` generates a fresh nonce per request and sets `script-src 'self' 'nonce-…' 'strict-dynamic'`. The root layout calls `connection()` so every page is rendered per request.
- **Trade-off:** No static pages or CDN HTML caching. Acceptable for a real-time game app; revisit with Next's experimental SRI if static marketing pages need caching.

## ADR-0008: CI uses the same `docker-compose.yml` as laptops

- **Context:** GitHub service containers can't pass command-line flags, and our Redis needs `--requirepass` and `--maxmemory-policy noeviction` (BullMQ).
- **Decision:** The integration job runs `docker compose up -d --wait` with throwaway values from `.github/ci.env`. A separate "bootstrap smoke" job proves a fresh clone sets itself up with no `.env`.

## ADR-0009: Security plugin exceptions are scoped and written down

- `eslint-plugin-security`'s `detect-object-injection` / `detect-non-literal-fs-filename` / `detect-non-literal-regexp` are disabled **only** for `scripts/**` and `packages/db/scripts/**` (local setup tools reading our own files). Elsewhere they stay on with `--max-warnings 0`, and any inline disable must carry a `-- reason`.

## ADR-0010: Security overrides for pinned transitive dependencies

- **Context:** CI's `pnpm audit --audit-level high` failed on `multer` 2.4.0 (GHSA-q7qp-rjg7-q26m, DoS), which `@nestjs/platform-express` 12.2.0 (latest) pins exactly.
- **Decision:** Force the patched `multer` 2.5.0 (same major) with `overrides` in `pnpm-workspace.yaml`. Each override has a comment naming the advisory and is removed as soon as the parent package ships the fix.
- **Accepted:** a *moderate* esbuild advisory (dev server CORS) inside `drizzle-kit`'s dev-only loader. It never runs in production and is below the CI threshold; revisit on the next drizzle-kit release.

## Dependencies added in M0

| Package | Licence | Why we need it |
|---|---|---|
| turbo | MIT | Task runner with caching across packages |
| typescript, @types/node | Apache-2.0 / MIT | Language and Node types |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-security, eslint-plugin-react-hooks, eslint-config-prettier, globals | MIT / Apache-2.0 | Linting incl. security and hooks rules |
| prettier | MIT | Formatting |
| husky, lint-staged | MIT | Pre-commit hook on staged files |
| zod | MIT | Runtime validation at every boundary |
| drizzle-orm, drizzle-kit | Apache-2.0 | ORM + migrations (spec) |
| postgres | Unlicense | Lean, maintained Postgres driver that Drizzle supports natively; no native build step |
| @nestjs/common, core, platform-express, cli, testing | MIT | Game server framework (spec) |
| @nestjs/throttler | MIT | HTTP rate limiting (spec) |
| reflect-metadata, rxjs | Apache-2.0 | NestJS peer dependencies |
| helmet | MIT | Security headers (spec) |
| ioredis | MIT | Redis client (spec) |
| pino | MIT | Structured logs with redaction (spec) |
| pino-pretty (dev) | MIT | Readable logs in local development only |
| next, react, react-dom, tailwindcss, @tailwindcss/postcss, postcss | MIT | Web app (spec) |
| vitest | MIT | Unit/integration tests (spec) |
| @playwright/test, @axe-core/playwright | Apache-2.0 / MPL-2.0 | E2E and accessibility tests (spec) |
| tsx | MIT | Run TypeScript scripts (DB scripts, simulator) without a build step |

Not added on purpose: `dotenv` (Node's built-in loader), `supertest` (Node's built-in `fetch`), `eslint-plugin-react` (doesn't support ESLint 10 yet; `dangerouslySetInnerHTML` is banned with a core `no-restricted-syntax` rule instead).

## Persistence proposal (implemented in M2/M4)

`profiles` (user_id PK → users, display_name, avatar_icon, avatar_color, age_confirmed_at, created_at, last_active_at) · `games` (id uuid, room_code, settings jsonb, seed nullable until finished, status, started_at, finished_at; indexes on status, finished_at) · `game_players` (game_id + seat PK, user_id nullable FK ON DELETE SET NULL, guest_name, is_bot, bot_level, final_cash, final_net_worth, placement; index on user_id) · `game_events` (game_id + seq PK, type, payload jsonb, created_at; app role INSERT/SELECT only) · `user_stats` (user_id PK, games_played, wins, best_net_worth, avg_placement). Better Auth tables come from its Drizzle adapter in M4.
