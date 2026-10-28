# stock-ex

Real-time multiplayer stock-market board game built with Next.js, NestJS, Socket.IO, PostgreSQL and Redis.
2–6 players trade shares in six fictional companies, read hidden price cards, and out-think the table.
**Play money only:** in-game rupees can never be bought, cashed out or converted to anything of value.

- Getting started and team workflow: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Product and engineering spec: [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Decisions: [docs/DECISIONS.md](docs/DECISIONS.md) · What we learned: [docs/LEARNING.md](docs/LEARNING.md)
- Security: [SECURITY.md](SECURITY.md) · [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) · Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

## Quick start

Prerequisites (Node 24, pnpm 12, Docker, gitleaks) are listed in [docs/DEVELOPMENT.md §2](docs/DEVELOPMENT.md#2-prerequisites-install-once).

```bash
pnpm bootstrap
```

```bash
pnpm dev
```

Then open http://localhost:3000. If anything fails: `pnpm healthcheck`.

## Status

| Milestone | Scope | State |
|---|---|---|
| M0 | Secure scaffold: monorepo, env validation, DB roles, CI, hooks, docs | In review |
| M1 | Game engine, heuristic bots, simulator | Next |
| M2–M7 | Game server, web app, accounts, polish, AI, production | Planned |

## Licence

All rights reserved; the code is published for viewing as a portfolio project. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
