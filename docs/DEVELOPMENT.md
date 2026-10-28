# stock-ex — Development Guide

This guide takes any developer from a fresh laptop to a running copy of stock-ex, and describes how the team works together day to day. Keep it accurate: whoever changes a command, port or environment variable updates this file in the same pull request.

> The `pnpm` commands in sections 4–6 exist from Milestone 0 onwards. On an older checkout, only sections 1–3 and the Git/Docker parts of section 4 work.

---

## 1. How the project runs locally

| Piece | Runs where | Address |
|---|---|---|
| Web app (`apps/web`, Next.js) | Your machine, `pnpm dev` | http://localhost:3000 |
| Game server (`apps/server`, NestJS + Socket.IO) | Your machine, `pnpm dev` | http://localhost:4000 (health: `/health`) |
| AI worker (`apps/ai-worker`) | Your machine, only when `FEATURE_AI=true` | no port |
| PostgreSQL | Docker | `localhost:5432` |
| Redis | Docker | `localhost:6379` |
| Drizzle Studio (database browser) | Your machine, `pnpm db:studio` | URL printed in the terminal |

Apps run directly on your machine for fast hot reload; only the databases run in Docker. Each developer has **their own** databases and their own `.env`. Nothing local is shared between developers.

---

## 2. Prerequisites (install once)

| Tool | Windows (PowerShell) | macOS / Linux | Check |
|---|---|---|---|
| Git | `winget install --id Git.Git` | `brew install git` / distro package | `git --version` |
| GitHub CLI | `winget install --id GitHub.cli` | `brew install gh` | `gh --version` |
| fnm (Node version manager) | `winget install --id Schniz.fnm` | `brew install fnm` | `fnm --version` |
| Node.js 24 LTS (version in `.nvmrc`) | `fnm install 24` then `fnm default 24` | same | `node -v` shows v24 |
| pnpm 12 | `npm install -g pnpm@12` | same | `pnpm -v` shows 12 |
| Docker Desktop | docker.com download (enable WSL 2) | docker.com download / Docker Engine | `docker compose version` |
| gitleaks (pre-commit secret scan) | `winget install --id Gitleaks.Gitleaks` | `brew install gitleaks` | `gitleaks version` |
| VS Code | code.visualstudio.com | same | — |
| Claude Code | `irm https://claude.ai/install.ps1 \| iex` | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude --version` |
| Claude Desktop app (Code tab) | Download from claude.com/download | same | Sign in, open the **Code** tab |
| TypeScript language server (for the `typescript-lsp` plugin) | `npm install -g typescript-language-server typescript` | same | `typescript-language-server --version` |

Notes:

- **pnpm version:** the exact pnpm version is pinned in `package.json` (`packageManager`). pnpm switches to it automatically; don't update it on your own.
- **fnm on Windows:** add this line to your PowerShell profile (`notepad $PROFILE`) so the right Node version is picked automatically when you `cd` into the repo:
  ```powershell
  fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
  ```
- **VS Code extensions:** when you first open the repo, VS Code offers the recommended extensions from `.vscode/extensions.json`. Click **Install all**.

### 2.1 Windows-only settings (once)

```powershell
git config --global core.longpaths true                     # node_modules has very long paths
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned         # lets pnpm/npm scripts run
```

- Keep the repo in a plain folder such as `C:\Projects\stock-ex`, **not** inside OneDrive, Dropbox or Google Drive. Sync clients fight with `node_modules` and `.git`.
- On 8 GB RAM machines, cap Docker's memory: create `C:\Users\<you>\.wslconfig` containing the two lines `[wsl2]` and `memory=4GB`, then run `wsl --shutdown`.

### 2.2 Accounts

| Account | Needed | Notes |
|---|---|---|
| GitHub (2FA on) | Yes | Collaborator access to the `stock-ex` repo with the **Write** role |
| Claude Pro or higher | Yes | For Claude Code |
| Google Cloud, Resend, Sentry, LLM provider | **No** for local development | The app runs locally with none of them (section 4.3) |

---

## 3. Git identity (once per machine)

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
git config --global init.defaultBranch main
git config --global pull.ff only          # `git pull` never creates surprise merge commits
gh auth login                             # GitHub.com → HTTPS → login with browser
```

---

## 4. First-time project setup

### 4.1 Get the code

```powershell
cd C:\Projects
gh repo clone <owner>/stock-ex
cd stock-ex
```

### 4.2 Add the private reference files

These are third-party materials, git-ignored on purpose. Get them from a teammate (shared drive, never GitHub) and place them here:

```
docs/rules/Stock_Exchange_Rules.pdf
docs/reference/Stock-Exchange-Website-Tour.pdf
docs/ui-reference/*.png          (6 screenshots)
```

### 4.3 Environment file

The **root `.env`** is the only environment file you edit. All apps read it and validate it with Zod at start-up; a missing or weak value stops the app with a message naming the variable.

**Easiest:** let `pnpm bootstrap` (section 4.4) create it: it copies `.env.example` and fills every `CHANGE-ME` with fresh random values, keeping the connection strings consistent with the passwords. When a teammate adds a variable, running `pnpm bootstrap` again appends just the missing keys (a backup `.env.backup-*` is written first; values are never printed).

By hand, if you prefer:

```powershell
Copy-Item .env.example .env        # macOS/Linux: cp .env.example .env
```

Then replace every `CHANGE-ME` value, keeping the passwords inside `DATABASE_URL`, `DATABASE_MIGRATION_URL` and `REDIS_URL` in sync with `APP_DB_PASSWORD`, `POSTGRES_PASSWORD` and `REDIS_PASSWORD`. Generate each secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Rules:

- Never commit `.env`, paste it into chat, or send it to a teammate. Each developer has their own values.
- If you add a variable, add it to `.env.example` (with a dummy value), to the Zod env schema, and to this guide, all in the same PR. Tell your teammate in the PR description.
- **Local development needs no third-party accounts:** emails print to the server console, Google sign-in is hidden while its keys are empty, Turnstile uses Cloudflare's public test keys, Sentry is off without a DSN, and AI features are off unless `FEATURE_AI=true`.

### 4.4 One-command setup (after M0)

```powershell
pnpm bootstrap
```

`pnpm bootstrap` checks your Node/pnpm versions and Docker, creates or upgrades `.env`, starts Postgres and Redis, waits until they're healthy, installs dependencies, builds the shared packages, creates the least-privilege database role the apps use (`APP_DB_USER`), runs migrations and seeds sample data. It's safe to run again at any time.

The database has two roles: the apps connect with `DATABASE_URL` as the **app role** (read/write rows only), while migrations and Drizzle Studio use `DATABASE_MIGRATION_URL` as the **owner role**. If your `.env` predates M0, bootstrap switches `DATABASE_URL` to the app role for you.

Before M0, do the Docker part by hand:

```powershell
docker compose up -d
docker compose ps                  # both services should show "healthy"
```

### 4.5 Run it

```powershell
pnpm dev
```

Open http://localhost:3000. Check the game server at http://localhost:4000/health.

If anything fails, run `pnpm healthcheck`. It prints a pass/fail checklist of everything above.

---

## 5. Daily workflow

### 5.1 Start of day

```powershell
git switch main
git pull
pnpm install                       # picks up dependency changes from teammates
pnpm db:migrate                    # applies teammates' schema changes
docker compose up -d               # if Docker isn't already running the services
pnpm dev
```

### 5.2 One task = one issue = one branch = one pull request

1. Pick or create an **Issue** on the project board and assign it to yourself.
2. Create a branch from fresh `main`, named `<type>/<issue-number>-<short-description>`:
   ```powershell
   git switch -c feat/14-engine-deck
   ```
   Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
3. Work in small commits using **Conventional Commits**, with the package as the scope:
   ```
   feat(engine): deal 10 cards per player from a seeded shuffle
   fix(server): reject actions from players who are not seated
   test(engine): property test for share supply limit
   ```
   Scopes: `engine`, `server`, `web`, `shared`, `db`, `ai`, `infra`, `docs`.
4. Before pushing, bring in your teammate's merged work and run the checks:
   ```powershell
   git fetch origin
   git merge origin/main
   pnpm lint; pnpm typecheck; pnpm test
   git push -u origin feat/14-engine-deck
   ```
5. Open the pull request:
   ```powershell
   gh pr create --fill
   ```
   Keep it under about 400 changed lines. Write "Closes #14" in the description so the issue closes on merge.

### 5.3 Reviewing a teammate's pull request

```powershell
gh pr list
gh pr checkout 15                  # their branch, locally
pnpm install; pnpm db:migrate; pnpm test; pnpm dev   # try it
gh pr review 15 --approve          # or --request-changes -b "what to fix"
```

Review checklist:

- [ ] Does it do what the issue and the spec say, and nothing unrelated?
- [ ] Tests cover the new behaviour; CI is green.
- [ ] No secrets, no `console.log` left behind, no new dependency without a note in `docs/DECISIONS.md`.
- [ ] Server-side validation and authorization for anything a client sends.
- [ ] Hidden game information can't leak to the wrong player.
- [ ] I could explain this code in an interview.

### 5.4 Merging

Merge only when CI is green and the other developer approved:

```powershell
gh pr merge 15 --squash --delete-branch
git switch main
git pull
```

### 5.5 End of day

Push your branch even if it isn't finished. Open it as a **draft PR** (`gh pr create --draft --fill`) so your teammate can see where you are.

---

## 6. Command reference (after M0)

| Command | What it does |
|---|---|
| `pnpm bootstrap` | One-time and repeatable full setup (section 4.4) |
| `pnpm healthcheck` | Checks your environment and prints what's wrong |
| `pnpm dev` | Runs web, server (and worker if enabled) with hot reload |
| `pnpm --filter @stock-ex/web dev` | Runs only one app |
| `pnpm build` | Production build of everything |
| `pnpm lint` / `pnpm lint:fix` | Lint / lint and auto-fix |
| `pnpm format` | Prettier on the whole repo |
| `pnpm typecheck` | TypeScript checks in all packages |
| `pnpm test` / `pnpm test:watch` | Unit tests in every package |
| `pnpm --filter @stock-ex/server test:integration` | Server tests against your running Postgres and Redis |
| `pnpm test:e2e` | Playwright end-to-end + axe accessibility tests (reuses `pnpm dev` if running, otherwise builds and starts the web app). First time: `pnpm --filter @stock-ex/web exec playwright install chromium` |
| `pnpm db:generate` | Create a migration from schema changes |
| `pnpm db:migrate` | Apply migrations to your local database |
| `pnpm db:seed` | Load sample data |
| `pnpm db:studio` | Browse the database in the browser |
| `pnpm db:reset` | **Wipe** your local database and re-migrate and re-seed (refuses on non-local databases) |
| `pnpm sim -- --games 1000` | Run bot-vs-bot simulations of the engine |

Docker:

| Command | What it does |
|---|---|
| `docker compose up -d` | Start Postgres and Redis |
| `docker compose ps` | Status and health |
| `docker compose logs -f postgres` | Follow Postgres logs |
| `docker compose stop` | Stop (data kept) |
| `docker compose down -v` | **Delete all local database data** |

---

## 7. Team rules that prevent conflicts

| Area | Rule |
|---|---|
| `main` | Never commit to it directly. Everything goes through a PR approved by the other developer. |
| Ownership | One person owns a package at a time, agreed on the project board. Swap areas between milestones so both of us know the whole system. |
| `packages/shared` (types, socket contracts) | Change only in small, separate PRs that are reviewed and merged the same day. |
| Database schema | One person changes the schema at a time. If two migrations collide, whoever merges second deletes their generated migration, merges `main`, and runs `pnpm db:generate` again. Never edit a migration after it's merged. |
| `pnpm-lock.yaml` | Never fix conflicts by hand: take `main`'s version, run `pnpm install`, commit the result. |
| Dependencies | Add one only with a short reason in `docs/DECISIONS.md`. Check it's real, maintained and widely used. |
| `CLAUDE.md`, `docs/PROJECT_SPEC.md`, this guide | Change only through a PR. |
| Line endings | Handled by `.gitattributes` (LF everywhere). Don't change Git's `autocrlf` setting. |

---

## 8. Working with Claude Code as a team

- Both developers use the same committed `CLAUDE.md` and `.claude/settings.json`, so Claude follows the same rules on every machine. Personal settings go in `.claude/settings.local.json` (git-ignored).
- Start Claude Code from the repo root, on your task branch.
- Begin each session with the scope, for example: *"Branch feat/14-engine-deck, issue #14. Only change packages/engine. The contracts in packages/shared are fixed."*
- Use plan mode (Shift+Tab) for anything bigger than a small fix, and read the plan before approving it.
- Claude's code gets the same review as human code. Read every diff; ask Claude to explain anything you couldn't explain yourself.
- Use Claude as a second reviewer: *"Review PR #15 against docs/PROJECT_SPEC.md and the security baseline."* Then do your own review.
- Never paste secrets into Claude. It is configured not to read `.env` files.
- Type `/clear` between unrelated tasks.

### 8.1 Desktop app or CLI

Both run the same Claude Code and read the same settings, `CLAUDE.md` and project plugins, so each developer can use whichever they prefer.

- **Desktop app:** open the **Code** tab, set **Environment** to **Local**, **Project folder** to the repo, and pick a **Permission mode** (Manual, Accept edits, Plan, Auto). Review changes in the diff view (comment on lines, then Ctrl+Enter). Use the integrated terminal (Ctrl+`) for your own commands. `.claude/launch.json` tells the built-in browser preview how to start the web app.
- **CLI:** run `claude` in the repo root; Shift+Tab cycles modes.
- **Check Node in the Desktop app:** the app may not load your PowerShell profile, so fnm's Node can be missing. In a new session ask Claude to run `node -v` and `pnpm -v`. If they fail, install Node from nodejs.org (the same major version as `.nvmrc`) and reinstall pnpm.
- **Worktrees:** parallel Desktop sessions can use Git worktrees under `.claude/worktrees/`, which is git-ignored.

### 8.2 Plugins

Install only Anthropic-verified plugins unless the team agrees otherwise; every plugin adds context to each conversation and can run code on your machine.

| Plugin (from `claude-plugins-official`) | Scope | When |
|---|---|---|
| `typescript-lsp` | Project (shared) | From M0 merge; needs the TypeScript language server from section 2 |
| `security-guidance` | Project (shared) | From M0 merge |
| `frontend-design` | Project (shared) | From M3 (UI work) |
| `code-review` | Project (shared) | From M0 merge, for PR reviews |
| `explanatory-output-style` | Personal | Any time; explains why code is built the way it is |
| `commit-commands` | Personal | Any time |
| `learning-output-style` | Personal, optional | Makes you write key parts yourself; good interview practice |
| `context7` (community) | Personal, optional | Current library docs in context |

Install with `/plugin install <name>@claude-plugins-official` (CLI) or the plugin browser (Desktop app). Project-scope plugins are recorded in `.claude/settings.json`; add or remove them only through a pull request.

---

## 9. Environments

| Environment | When | Deployed from | Data |
|---|---|---|---|
| Local | Always | Your branch | Your own Docker databases; sample data only |
| Staging | From the end of M3 | Every merge to `main`, automatically | Separate database and secrets; test accounts only |
| Production | M7 | Release from `main` after staging is checked | Real users; access limited to the two of us |

Staging and production secrets live only in the hosting platforms and GitHub Actions secrets, never on laptops or in chat.

---

## 10. New developer checklist

- [ ] GitHub account with 2FA; accepted the `stock-ex` collaborator invite
- [ ] Tools from section 2 installed and their check commands work
- [ ] Windows settings from section 2.1 done (Windows only)
- [ ] Git identity and `gh auth login` done (section 3)
- [ ] Repo cloned; private reference files in `docs/`
- [ ] `.env` created with your own secrets
- [ ] `pnpm bootstrap` and `pnpm healthcheck` pass
- [ ] `pnpm dev` runs; http://localhost:3000 opens
- [ ] Claude Code (Desktop app and/or CLI) logged in; `node -v` works inside a Claude session; shared plugins installed (section 8.2)
- [ ] Read `CLAUDE.md` and `docs/PROJECT_SPEC.md`
- [ ] First small PR (for example, fixing something unclear in this guide) opened, reviewed and merged

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot connect to the Docker daemon` | Open Docker Desktop and wait for "Engine running". |
| `port 5432 is already allocated` | Another Postgres is installed. Stop it (Windows Services), or change the left port in `docker-compose.yml` to `5433` and update `DATABASE_URL`. |
| `pnpm` / `npm` scripts blocked in PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `Filename too long` on Windows | `git config --global core.longpaths true`, then clone again. |
| Wrong Node version / `Unsupported engine` | `fnm install; fnm use` in the repo root. |
| App says an env variable is missing | Run `pnpm bootstrap`: it appends variables a teammate added to `.env.example`. |
| Database errors after pulling | `pnpm db:migrate`. Still broken locally: `pnpm db:reset`. |
| Commit blocked: "gitleaks is not installed" | Install it (section 2). The hook fails closed on purpose: no scan, no commit. |
| Commit blocked by gitleaks | You staged a secret. Unstage it, move it to `.env`. If it ever reached GitHub, rotate the secret immediately. |
| Every line shows as changed | Line-ending problem: run `git add --renormalize .` and tell your teammate. |
| Merge conflict in `pnpm-lock.yaml` | `git checkout --theirs pnpm-lock.yaml` (while merging `main`), then `pnpm install` and commit. |
| Claude Desktop app can't find `node` or `pnpm` | Install Node from nodejs.org (same major as `.nvmrc`), then `npm install -g pnpm@12`; restart the app. |
| Something else | `pnpm healthcheck`, then ask your teammate with the exact error message. |
