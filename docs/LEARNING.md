# What we learned

Plain-language notes on the concepts behind each milestone, with pointers to the code. Written for us coming from PHP / CodeIgniter 4, and for interview prep.

---

## Milestone 0: secure scaffold

### Monorepo with pnpm workspaces + Turborepo
One Git repo holds every app and library. **pnpm workspaces** link them (`"@stock-ex/shared": "workspace:*"` means "use the copy in this repo"). **Turborepo** runs a script (`build`, `lint`, `test`) in every package in dependency order and caches results, so a second `pnpm lint` with no changes is instant. CodeIgniter comparison: imagine `app/`, `system/` and your own libraries as separate Composer packages that are always version-locked together.
→ `pnpm-workspace.yaml`, `turbo.json`

### Building internal packages
`packages/shared`, `db` and `engine` compile TypeScript to `dist/` with `tsc`, and their `package.json` `exports` point at `dist`. Apps import the compiled JS like any npm package. That's why `turbo.json` says `"dependsOn": ["^build"]`: the caret means "build my dependencies first".
→ `packages/shared/package.json`, `docs/DECISIONS.md` ADR-0004

### Environment validation with Zod ("fail fast")
TypeScript types vanish at runtime, so `process.env.SECRET` could be missing or `"CHANGE-ME"` while the code compiles fine. Each app parses its slice of `.env` through a **Zod schema** at start-up and refuses to boot with a list of *names* that are wrong (never the values). It's like CodeIgniter's `.env` plus a validation rule set that runs before the framework starts.
→ `packages/shared/src/env/schema.ts`, `load.ts`, tests in `env.test.ts`

### Least privilege in the database
Two Postgres roles: the **migration role** owns the tables and can change them, the **app role** can only read and write rows. If someone found an injection bug in the app, they still couldn't `DROP TABLE`. `pnpm healthcheck` actually asks Postgres `has_schema_privilege(current_user, 'public', 'CREATE')` to prove it.
→ `packages/db/scripts/ensure-roles.ts`, `scripts/ping.ts`

### Why `format('%I', '%L')` in SQL
Normal values are passed as query parameters (`$1`), which makes injection impossible, and Drizzle always does this. But `CREATE ROLE name PASSWORD 'x'` can't take parameters. Instead of gluing strings together, we ask Postgres to quote them: `%I` quotes an identifier, `%L` a literal.

### Content Security Policy with a nonce
A **CSP** header tells the browser which scripts may run. A **nonce** is a random value generated per request: Next.js stamps it on its own `<script>` tags, and the header says "only scripts with this nonce". An attacker who injects `<script>` can't guess it, so XSS payloads don't execute. The cost: every page is rendered per request (no static HTML caching).
→ `apps/web/proxy.ts`, `apps/web/app/layout.tsx`, `apps/web/src/csp.test.ts`

### Hardened HTTP server
`helmet` adds security headers; CORS only allows the web app's own origin; a **global exception filter** turns any error into `{ code, message }` so stack traces never reach a browser; `trust proxy` is off unless we're behind a known proxy, so attackers can't fake their IP with `X-Forwarded-For`.
→ `apps/server/src/bootstrap.ts`, `common/all-exceptions.filter.ts`

### Structured logging with redaction
pino writes JSON lines that log platforms can search. A **redact** list replaces passwords, tokens, cookies and emails with `[redacted]` *before* the line is written, and a unit test proves it.
→ `apps/server/src/logger/logger.ts`, `logger.test.ts`

### Supply-chain safety
The lockfile pins every transitive dependency; CI installs with `--frozen-lockfile`. pnpm blocks packages' install scripts unless approved (`allowBuilds` in `pnpm-workspace.yaml`; only `esbuild` is allowed). GitHub Actions are pinned to commit SHAs, because a tag like `v7` can be moved by whoever controls the repo.
→ `pnpm-workspace.yaml`, `.github/workflows/ci.yml`

### Secret scanning
**gitleaks** runs in the pre-commit hook on staged changes and in CI on new commits. The hook fails *closed*: if gitleaks isn't installed, the commit is blocked rather than silently skipped.
→ `.husky/pre-commit`, `.gitleaks.toml`

### NestJS dependency injection without magic
Nest normally reads constructor parameter types from metadata the TypeScript compiler emits (`emitDecoratorMetadata`). We write `@Inject(HealthService)` explicitly, so DI also works in test runners that don't emit that metadata, and the code says exactly what it receives.
→ `apps/server/src/health/health.controller.ts`, `apps/server/vitest.config.ts`

## Milestone 4 (first slice): accounts and email

### Who checks the rules: the form or the server?
Both, but only the server's check counts. The login card validates with the shared Zod schemas for instant feedback, and a Better Auth `before` hook runs `signUpRequestSchema` on the server. Anyone can skip the form and call `/api/auth/sign-up/email` directly; the hook still refuses a missing 18+ tick or a name like `<img>`.
→ `packages/shared/src/auth.ts`, `apps/web/src/lib/auth.ts` (`hooks.before`)

### Email verification before any session
With `requireEmailVerification`, sign-up creates the user but no session. The emailed link carries a signed token; opening it marks the email verified and signs you in. Until then, logging in answers 403 and sends a fresh link.
→ `apps/web/src/lib/auth.ts` (`emailVerification`), `apps/web/src/components/auth-card.tsx` (`inbox` mode)

### Not telling attackers which emails exist
"Forgot password" and "create account" reply the same whether or not the address has an account. The real owner gets an email ("someone tried to sign up with your address") and the stranger learns nothing.
→ `onExistingUserSignUp` in `apps/web/src/lib/auth.ts`

### Sending email after the response
Better Auth hands each email's promise to `advanced.backgroundTasks`, and we pass it to Next's `after()`. The visitor gets an answer straight away, slow SMTP can't stall the request, and response times don't give away whether an account exists.

### SMTP, not a vendor SDK
nodemailer speaks plain SMTP, so moving from Gmail to Brevo to Resend is a change in `.env`, not in code. Without `SMTP_HOST`, development prints each email in the terminal and saves it to `.dev-mail/`; production refuses to send.
→ `apps/web/src/lib/email/`, `docs/EMAIL.md`

### Two copies of one library
Better Auth brings `kysely`, an optional peer of drizzle-orm, so pnpm made a second copy of drizzle-orm for the web app, and Drizzle types from the two copies don't mix. The fix: apps never import drizzle-orm. All queries live in `@stock-ex/db` (`createProfile`, `getProfile`, `confirmAge`).
→ `packages/db/src/profiles.ts`

### Turnstile and the CSP
Turnstile's script is added by a trusted script, which `'strict-dynamic'` allows, so the only CSP change is `frame-src https://challenges.cloudflare.com` for its iframe. Turnstile also checks the device clock: a PC whose clock is hours off sees "Incorrect device time".
→ `apps/web/proxy.ts`
