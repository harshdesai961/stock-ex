# Architecture

Updated each milestone. Diagrams are Mermaid (GitHub renders them).

## System overview

```mermaid
flowchart LR
  subgraph Browser
    UI[React UI<br/>Zustand store]
  end
  subgraph Web["apps/web (Next.js, Vercel)"]
    Pages[Pages + route handlers]
    Auth[Better Auth<br/>M4]
    Proxy[proxy.ts<br/>nonce CSP]
  end
  subgraph Server["apps/server (NestJS, container)"]
    GW[Socket.IO gateway<br/>M2]
    Q[Per-room action queue<br/>M2]
    Health["/health"]
  end
  Engine[["packages/engine<br/>pure rules (M1)"]]
  Worker["apps/ai-worker<br/>LangGraph (M6)"]
  PG[(PostgreSQL<br/>accounts, finished games,<br/>event log)]
  R[(Redis<br/>live snapshots, pub/sub,<br/>BullMQ, rate limits)]

  UI -- HTTPS --> Pages
  UI -- "WSS + short-lived token" --> GW
  Pages --> PG
  Pages -. "signs socket token (jose)" .-> UI
  GW --> Q --> Engine
  Q --> R
  Server --> PG
  Worker --> R
  Health --> PG
  Health --> R
```

**Rules of the road**

- The browser only ever sends *intents*. The game server validates, authorizes, applies them through the engine and broadcasts per-player projections.
- Only the game server reads or writes live game state. Hidden cards, deck order and the seed never leave it before they should.
- The engine is a pure library: the server, the simulator and (later) the replay viewer all call the same functions.

## Milestone 0: what exists today

```mermaid
flowchart TB
  root[".env (root, git-ignored)"] --> shared["@stock-ex/shared/env<br/>Zod schemas + loader"]
  shared --> web["apps/web<br/>next.config.ts validates at boot"]
  shared --> server["apps/server<br/>main.ts validates at boot"]
  shared --> worker["apps/ai-worker<br/>exits unless FEATURE_AI=true"]
  shared --> db["packages/db scripts<br/>roles · migrate · seed · status"]
  db -- "DATABASE_MIGRATION_URL<br/>(owner: DDL)" --> PG[(Postgres)]
  server -- "DATABASE_URL<br/>(app role: data only)" --> PG
  server --> R[(Redis)]
```

| Package | Builds to | Consumed by |
|---|---|---|
| `@stock-ex/config` | (source: JSON/JS/CSS presets) | every workspace |
| `@stock-ex/shared` | `dist/` via `tsc` | web, server, worker, db |
| `@stock-ex/db` | `dist/` via `tsc` | server (and web in M4) |
| `@stock-ex/engine` | `dist/` via `tsc` | server (M2), web replay viewer (M4) |

Turborepo runs `build` for dependencies before `dev`, `lint`, `typecheck` and `test` (`dependsOn: ["^build"]`), and `pnpm dev` keeps the packages rebuilding with `tsc --watch`.
