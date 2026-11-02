# Contributing to stock-ex

The full setup and daily workflow are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). This page is the short version.

## Workflow

1. **One task = one issue = one branch = one pull request.** Branch from fresh `main`:
   `<type>/<issue>-<short-description>`, e.g. `feat/14-engine-deck`. Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
2. **Conventional Commits** with the package as scope: `feat(engine): deal 10 cards per player`.
   Scopes: `engine`, `server`, `web`, `shared`, `db`, `ai`, `infra`, `docs`.
3. Before pushing: `git fetch origin && git merge origin/main`, then `pnpm lint; pnpm typecheck; pnpm test`.
4. Open the PR with `gh pr create --fill`, keep it under ~400 changed lines, write `Closes #<issue>`, and fill in the template's security checklist.
5. **Merge only with green CI and one approving review from the other developer.** Squash merge, delete the branch.

## Pre-commit hook

Husky runs on every commit: gitleaks on staged changes (the commit is blocked if gitleaks is missing or finds a secret), Prettier + ESLint on staged files, then a typecheck of affected packages. Never skip it with `--no-verify`.

## Protecting `main` (repository owner, once)

GitHub settings are changed by a person, not by scripts or Claude. The owner runs this once, after the first CI run so the check names exist:

```bash
gh api -X POST repos/harshdesai961/stock-ex/rulesets --input .github/main-ruleset.json
```

The ruleset ([.github/main-ruleset.json](.github/main-ruleset.json)) requires a pull request with one approval and resolved conversations, the CI checks to pass, squash merges only, and blocks force-pushes and deletion of `main`. Also turn on, under **Settings → Code security**: Dependabot alerts, Dependabot security updates, private vulnerability reporting, and secret scanning with push protection (free once the repo is public).
