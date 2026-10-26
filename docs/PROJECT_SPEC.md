# Build "stock-ex": a real-time multiplayer stock-market board game

You are building a production-quality, web-based, real-time multiplayer adaptation of a physical stock-trading board game. Two developers will build it as a portfolio project for a job switch. We come from PHP / CodeIgniter 4 and are using this project to learn a modern TypeScript stack at a beginner-to-intermediate level. Code quality, architecture, security, tests and documentation matter as much as features, because we will explain every part of this in interviews.

**Security, privacy and compliance are day-one requirements, not a final milestone.** Every control in Section 12 is built in the milestone where its code first appears.

---

## 0. How you must work

1. **Start in plan mode.** Read this whole file, plus `docs/DEVELOPMENT.md` (team setup and workflow), `docs/TECH_STACK.md` (stack rationale and security baseline; this spec wins on any conflict), `docs/rules/` (the original manual PDF), `docs/reference/` (a competitor's website tour PDF) and `docs/ui-reference/*.png` (UI inspiration screenshots). Produce a written implementation plan before writing any code.
2. **Ask before guessing.** If anything is ambiguous or contradicts itself, ask. Section 4.10 lists interpretations already chosen. Never silently change game rules.
3. **Work milestone by milestone** (Section 16). Stop at the end of each milestone, summarize what was built, how to run it and what is next, and wait for approval.
4. **Use the latest stable versions** of every library and check current official docs for APIs. Don't rely on memory for fast-moving libraries (Next.js, Better Auth, Drizzle, LangGraph.js, Socket.IO, NestJS). Record chosen versions in `docs/DECISIONS.md`.
5. **Keep dependencies minimal.** Before adding any dependency not in Section 2, confirm it exists, is actively maintained, widely used and has a compatible licence, and justify it in `docs/DECISIONS.md`. Never invent package names.
6. **Small commits** using Conventional Commits, on feature branches. Never commit secrets. Keep `.env.example` complete and current.
7. **Done means green:** `pnpm lint`, `pnpm typecheck`, `pnpm test` and the security checks (Section 13) pass before you declare a milestone done.
8. **Teach us.** After each milestone, append to `docs/LEARNING.md` plain-language explanations of the new concepts with pointers to the code (for example: authoritative server, state projection, Redis adapter, seeded RNG, event sourcing, CSP).
9. **Maintain `CLAUDE.md`** at the repo root: commands, conventions, architecture notes and security rules. Two developers use Claude Code on this repo, so it must be the shared source of conventions.
10. **Never read or print `.env` files or real secrets.** Use `.env.example` for variable names.

---

## 1. Product summary

- 2–6 players trade shares in 6 fictional companies over a pre-agreed number of **Bargain Periods**.
- Each player is dealt 10 **private** information cards per period that hint at how prices will move.
- Players take turns making one transaction at a time (buy, sell, play a windfall card, or pass), 3 transactions each per period.
- At the end of the period all cards are revealed, prices move by the sum of the revealed cards, and special effects resolve.
- The winner has the highest **cash + share value** at final prices.
- No dice. A game of hidden information, inference and timing.
- Modes for v1: play vs bots (Easy/Medium/Hard), casual public rooms, private rooms by link or 5-character code, spectators.
- **Play money only.** In-game rupees can never be bought, cashed out or converted to anything of value. This keeps the product an "online social game" under India's Promotion and Regulation of Online Gaming Act, 2025.

**Original identity:** fictional company names, no real logos, original art and original rules text. Do not reuse the board game's name, logo, card art or manual wording. Everything is config-driven so names and prices change in one file.

---

## 2. Tech stack (fixed decisions)

| Area | Choice |
|---|---|
| Language | TypeScript everywhere, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Runtime | Node.js Active LTS |
| Monorepo | pnpm workspaces + Turborepo |
| Web app | Next.js (App Router) + React, Tailwind CSS, shadcn/ui (Radix), Motion (formerly Framer Motion), Zustand (live game state), TanStack Query (REST data), `socket.io-client`, TradingView Lightweight Charts (follow its attribution requirement) |
| Game server | NestJS with a Socket.IO gateway, `@socket.io/redis-adapter`, `ioredis`, helmet, `@nestjs/throttler`, pino |
| Game engine | Pure TypeScript package: no I/O, no framework imports, deterministic |
| Validation | Zod schemas shared between client and server (`packages/shared`), plus Zod-validated environment variables |
| Database | PostgreSQL + Drizzle ORM + drizzle-kit migrations |
| Cache / realtime infra | Redis (Valkey-compatible): Socket.IO adapter, live game snapshots with TTL, room directory, rate limits, leaderboards. BullMQ for bot turns, timers and post-game jobs. Redis configured with `maxmemory-policy noeviction`. |
| Auth | Better Auth in the Next.js app (email + password, Google OAuth), sessions in Postgres, httpOnly Secure SameSite cookies. **Guest play** with only a nickname. Next.js issues a short-lived (≈5 min) signed socket token (JWT via `jose`); the game server verifies it on the handshake and on reconnect. **No tokens in localStorage.** |
| Email | Resend (or similar) for verification and password-reset emails |
| Bot protection | Cloudflare Turnstile on sign-up |
| AI (Milestone 6, feature-flagged) | LangGraph.js with a provider-agnostic chat model configured by env vars, in `apps/ai-worker`, consuming BullMQ jobs |
| Testing | Vitest, fast-check, Playwright + `@axe-core/playwright`, Artillery (Socket.IO load tests) |
| Observability | pino (with redaction), Sentry (web + server, PII scrubbing on), `/health` endpoints, uptime monitor |
| Dev tooling | ESLint (incl. security + react-hooks plugins), Prettier, Husky + lint-staged, gitleaks |
| DevOps | Docker + Docker Compose, GitHub Actions, Dependabot |
| Hosting | Web on Vercel; game server + worker on Railway, Render or Fly.io; managed Postgres and Redis in a region near India; Cloudflare for DNS/TLS. Staging and production use subdomains of one domain (e.g. `app.` and `api.`). |

---

## 3. Repository layout

```
/apps
  /web          Next.js app (UI, auth, REST route handlers)
  /server       NestJS game server (rooms, sockets, timers, persistence)
  /ai-worker    LangGraph bot + commentary worker (Milestone 6)
/packages
  /engine       Pure game engine + heuristic bots + CLI simulator
  /shared       Zod schemas, socket event contracts, shared types, formatting utils
  /db           Drizzle schema, migrations, db client, seed scripts
  /config       Shared eslint / tsconfig / tailwind presets
/docs
  /rules        Original manual PDF + rules.md (written from Section 4, in our own words)
  /reference    Competitor website tour PDF (inspiration only; do not copy code or assets)
  /ui-reference Screenshots for inspiration
  ARCHITECTURE.md      Mermaid diagrams
  DECISIONS.md         ADR-style decision log
  LEARNING.md
  THREAT_MODEL.md      Updated every milestone
  DATA_INVENTORY.md    Every personal-data field: purpose, location, processor, retention
  INCIDENT_RUNBOOK.md  Breach response, incl. the 72-hour report
  DEPLOYMENT.md
  DEVELOPMENT.md       Setup and daily workflow for every developer (already provided; keep it current)
  TECH_STACK.md        Stack rationale and security baseline (already provided)
  CONTRIBUTING.md      Short summary of branching, PR review and commit style, linking to DEVELOPMENT.md
.github/
  workflows/           CI (Section 13)
  dependabot.yml
  pull_request_template.md
  CODEOWNERS
SECURITY.md            How to report a vulnerability
THIRD_PARTY_NOTICES.md Licences of fonts, sounds, libraries we ship
LICENSE
CLAUDE.md
docker-compose.yml
.env.example
```

---

## 4. Game rules: the authoritative spec

Transcribe this section into `docs/rules/rules.md` in your own words and implement it exactly.

### 4.1 Companies (config: `packages/engine/src/config/companies.ts`)

| Slot | Fictional name (default) | Opening price (₹) | Price-card values (each value appears **twice** in the deck) |
|---|---|---|---|
| C1 | Sanjeevani Pharma | 20 | +10, +5, −5, −10 |
| C2 | Kuber Bank | 25 | +15, +10, +5, −5, −10, −15 |
| C3 | Vajra Motors | 40 | +15, +10, +5, −5, −10, −15 |
| C4 | Agni Energy | 55 | +20, +15, +10, +5, −5, −10, −15, −20 |
| C5 | Sagar Industries | 75 | ±25, ±20, ±15, ±10, ±5 |
| C6 | Vidya Infotech | 80 | ±30, ±25, ±20, ±15, ±10, ±5 |

46 distinct values × 2 = **92 price cards**. Each company's cards sum to zero.

### 4.2 The full deck (108 cards)

- 92 share price cards.
- 8 currency cards: `+10%` × 4 and `−10%` × 4.
- 8 windfall cards: `SHARE_SUSPENDED`, `LOAN_STOCK_MATURED`, `DEBENTURE`, `RIGHTS_ISSUE`, 2 of each.

Unit-test that the deck has exactly 108 cards with this composition.

### 4.3 Setup

- 2–6 players take fixed seats 0–5 clockwise.
- Each player starts with **₹6,00,000** cash (configurable 6–10 lakh in the lobby).
- Each company has a **total supply of 2,00,000 shares**. The bank (server) holds everything players don't.
- Lobby settings: number of Bargain Periods (default 5, range 1–20), turn timer, max players, private/public, allow bots, logged-in only, house rules (4.10).
- Money is integer rupees; quantities are integers in **multiples of 1,000**. Never use floats for money.

### 4.4 A Bargain Period

1. Shuffle all 108 cards with the game's **seeded PRNG** and deal 10 face-down to each player. Hands are private. Undealt cards are unused this period.
2. **Trading phase:** 3 rounds; each round every player makes exactly one transaction, clockwise from the period's starting player.
3. The first period's starting player is drawn at random; the start then **rotates clockwise each period**.
4. Every transaction is public in the Market Tape (who, what, quantity, price). Cards are never public during trading.
5. After 3 × (number of players) transactions, go to end-of-period resolution (4.6).

### 4.5 Transactions (exactly one per turn)

- **BUY** `{companyId, qty}`: positive multiple of 1,000. Cost = qty × current price. Requires cash ≥ cost, bank supply ≥ qty, company not insolvent.
- **SELL** `{companyId, qty}`: positive multiple of 1,000, ≤ holdings, company not insolvent. Player receives qty × current price.
- **PLAY_WINDFALL** `{cardId, params}`: `LOAN_STOCK_MATURED`, `DEBENTURE` or `RIGHTS_ISSUE` (4.7).
- **PASS**: forfeits the transaction. Also the automatic action on timeout.

Prices do not change during trading.

### 4.6 End-of-period resolution (strict order)

1. **Reveal** all hands to everyone (the UI reveals one company at a time).
2. **Privileges (veto)** (4.8): per company, at most one card withdrawn by its Chairman or Director.
3. **Compute movement** per company = sum of its remaining price cards.
4. **Share Suspended decisions:** each holder of `SHARE_SUSPENDED` may freeze one company (movement 0 this period), in clockwise order from the starting player, with a timer. Unused cards are discarded.
5. **Apply prices:** `newPrice = max(0, price + movement)` for non-frozen companies.
6. **Currency:** net = count(`+10%`) − count(`−10%`) across all hands. Net > 0: every player receives 10% of cash in hand. Net < 0: every player pays 10% of cash in hand. Net = 0: nothing. Round each adjustment to the **nearest ₹5,000**.
7. **Insolvency** (4.9): update flags.
8. Discard all hands; windfalls cannot be retained.
9. Last period → game over; otherwise the next period (4.4).

### 4.7 Windfall cards

- **LOAN_STOCK_MATURED:** a transaction in the period dealt; receive ₹1,00,000 from the bank.
- **DEBENTURE:** a transaction in the period dealt; legal only if the player holds shares in a **currently insolvent** company. Redeem all shares in that one company at its **opening game price**; shares return to the bank.
- **RIGHTS_ISSUE:** a transaction in the period dealt. Pick a non-insolvent company in which the player holds shares.
  - The holder may buy up to `floor(holding / 2 / 1000) × 1000` extra shares at a fixed **₹10 per share** (13,000 held → up to 6,000).
  - Then **every other holder** of that company gets the same offer, clockwise from the card holder, in a timed interrupt sub-phase (default: decline).
  - Each may accept any multiple of 1,000 up to their entitlement, limited by cash and remaining bank supply. Total supply never exceeds 2,00,000; if it runs short, the card holder has priority, then clockwise order.
- **SHARE_SUSPENDED:** not a transaction; used only in step 4 of 4.6.

### 4.8 Chairman and Director (evaluated at end of period from holdings then)

- **Chairman:** ≥ 1,00,000 shares of a company; one per company. Ties go to whoever reached 1,00,000 **first** (lowest action sequence number). Status is lost if holdings fall below the threshold. Privilege: withdraw the **single most negative card of that company from all revealed hands**.
- **Director:** 50,000–99,000 shares. If several, highest holding wins; ties go to whoever reached that holding first. Privilege: withdraw **one card of that company from their own hand**.
- **At most one card withdrawn per company per period.** The Chairman acts first; the Director only if there is no Chairman or the Chairman declines.
- Decisions are timed. On timeout the Chairman auto-withdraws the most negative card (if any), the Director their own most negative card of that company (if any).
- Track `thresholdReachedAt` per player per company for deterministic tie-breaks.
- Show current Chairman/Director names on each company tile.

### 4.9 Insolvency

- A company whose price reaches 0 is **insolvent** for the next period: no BUY, SELL or RIGHTS_ISSUE. Holders keep worthless shares.
- Price stays at 0, never negative. Its cards are still dealt and revealed; a positive movement at the next resolution brings it back.

### 4.10 Interpretations (configurable as `houseRules`)

- The manual's "Total 43" is a misprint: 46 distinct values × 2 = 92, consistent with 108 cards.
- `currencyMode: 'flat' | 'scaled'` (default `flat`: ±10% if net ≠ 0; `scaled`: ±10% × |net|).
- `debentureRedeemPrice: 'opening' | 'lastNonZero'` (default `opening`).
- `directorMayWithdrawAnyOwnCard` (default `true`).
- `maxWindfallsPerHand: number | null` (default `null` = no limit, as in the manual).
- Lots: any multiple of 1,000; the UI offers 1K / 5K / 10K / Max quick picks plus a slider.
- A player may be Chairman or Director of several companies at once.

### 4.11 Winning

Final net worth = cash + Σ(holdings × final price). Highest wins; ties broken by cash, then shared placement. Show a full breakdown.

---

## 5. Engine architecture (`packages/engine`)

- **Pure functions only:** `createGame(settings, players, seed)`, `applyAction(state, playerId, action) → { state, events } | EngineError`, `getLegalActions(state, playerId)`, `applyTimeout(state)`, `projectForPlayer(state, playerId | 'spectator')`.
- **Explicit phase state machine** with discriminated unions: `LOBBY → DEALING → TRADING → (RIGHTS_ISSUE_OFFERS) → REVEAL → PRIVILEGES → SUSPENSIONS → SETTLEMENT → next period | GAME_OVER`.
- **All-or-nothing actions:** an action either applies completely or returns an error with state unchanged (fail closed).
- **Event-sourced:** every accepted action produces typed domain events. The game replays exactly from `seed + action log`; the event log drives UI animations and the replay viewer.
- **Projection is the anti-cheat boundary.** Clients and spectators never receive other players' hands, the deck order or the seed before reveal / game end.
- **Seeds:** generated with `node:crypto` by the server (never by the engine), kept secret until Game Over, then shown so players can verify fairness.
- `stateVersion` increments on every change; actions carry the version they target; stale actions are rejected.
- **CLI simulator** (`pnpm sim --players 6 --periods 5 --bots hard,medium,easy --games 1000`): runs bot-vs-bot games and prints win rates, average net worth and price distributions.

---

## 6. Real-time game server (`apps/server`)

- **Rooms:** unguessable 5-character codes (crypto-random, unambiguous alphabet) plus invite links; host; seats; up to 10 spectators outside the seat limit. Host can add/remove bots, kick, change settings and start. "Open the Market" starts a short countdown.
- **Authoritative server:** clients send intents; the server validates with Zod, authorizes (session user owns this seat, it is their turn, host-only actions), applies via the engine, then broadcasts. Clients never compute outcomes. **User identity always comes from the verified socket token, never from message payloads.**
- **Per-room action queue:** all actions for a room are processed strictly one at a time (a per-room mutex/queue), in addition to the `stateVersion` check, so two rapid clicks can never spend the same cash.
- **Idempotency:** each client action carries a client-generated `actionId`; duplicates are acknowledged without re-applying.
- **Socket events** (contracts in `packages/shared` with Zod, acknowledgements with typed errors):
  - Client → server: `room:create`, `room:join`, `room:spectate`, `room:takeSeat`, `room:leave`, `room:updateSettings`, `room:addBot`, `room:removeBot`, `room:kick`, `room:start`, `room:rematch`, `game:action`, `game:decision` (privilege, suspension, rights offer), `game:takeBackControl`, `chat:send`, `chat:report`, `presence:ping`.
  - Server → client: `room:state`, `game:state` (per-player projection), `game:events` (ordered batch for animations), `game:timer`, `chat:message`, `error`.
- **Timers** are owned by the server (BullMQ delayed jobs or persisted deadlines) and survive restarts. Clients only display them.
- **Reconnection:** a player who refreshes within a grace period (default 60s) gets their seat and state back. After that a Medium bot plays their seat with an "AFK" badge until they press **Take back control**.
- **Rematch:** host can restart the same table with the same seats, or return everyone to the lobby.
- **Redis:** Socket.IO adapter; a game snapshot after every accepted action; **TTL on all room keys (default 6 hours, refreshed on activity)**; public room directory; rate-limit counters; leaderboard sorted sets.
- **BullMQ:** bot turns (with a small human-like delay), turn timeouts, persisting finished games, stats updates, LLM jobs. Every job payload is Zod-validated.
- **Chat:** rate- and length-limited, server sets the sender name, mute and report buttons, a basic profanity filter, never rendered as HTML.
- **Graceful shutdown:** stop accepting actions, snapshot all live games, close sockets.

---

## 7. Persistence (`packages/db`, Drizzle + Postgres)

Propose details in the plan. Minimum tables:

- Better Auth tables (users, sessions, accounts, verifications).
- `profiles`: display name, avatar config, `age_confirmed_at`, created_at, last_active_at.
- `games`: id, room_code, settings json, seed (stored only after game end), status, started_at, finished_at.
- `game_players`: game_id, user_id nullable, guest_name, seat, is_bot, bot_level, final_cash, final_net_worth, placement.
- `game_events`: game_id, seq, type, payload jsonb, created_at. **Append-only** (no updates or deletes from app code).
- `user_stats`: games played, wins, best net worth, average placement.

Two database roles: an app role (read/write data, no DDL) and a migration role. Indexes where queries need them. Seed scripts for local development only.

---

## 8. Auth, identity and accounts

- **Guest flow** (Richup-style): nickname (max 10 chars, unique at the table case-insensitively, a 🎲 random-name button), signed guest token. No personal data stored.
- **Account flow:** Better Auth email + password (min 8 chars, rate-limited sign-in, email verification, session rotation on login, server-side logout) and Google sign-in. Turnstile on sign-up.
- **Accounts are 18+.** Sign-up requires an explicit age confirmation checkbox (recorded with timestamp). Do not collect date of birth.
- Logged-in users get match history, stats, leaderboards, persistent avatar, replays.
- **Account self-service:** change display name; **export my data** (JSON download); **delete my account** (erases personal data, anonymises their rows in game history, signs out everywhere).
- "Only logged-in users" room setting enforced at join.
- Avatars: a fixed set of icons × colours chosen from config; the server rejects any avatar value not in the set (never accept URLs).

---

## 9. Bots

### 9.1 Heuristic bots (`packages/engine/src/bots`, Milestone 1)

- Bots see only `projectForPlayer` output, never hidden state.
- **Easy:** mostly random legal actions, slightly weighted by its own hand.
- **Medium:** expected movement per company = sum of its own cards; buys best expected return per rupee, sells expected losers, uses windfalls when legal and beneficial; answers rights offers sensibly.
- **Hard:** card counting. Each company's cards sum to 0, so the expected sum of that company's cards in other hands is `-ownSum × (10 × (P − 1)) / (108 − 10)`. Also infers from public trades, targets Chairman/Director thresholds, considers currency cards, Share Suspended, and final-period valuation.
- Deterministic given a seed. Human-like names from a list, always shown with a 🤖 badge.

### 9.2 LLM bot + market commentator (`apps/ai-worker`, Milestone 6, behind `FEATURE_AI=true`)

- LangGraph.js graph: `observe` (compact summary from the bot's projection only) → `analyze` (tools: `getExpectedMovements`, `getLegalActions`, `simulateAction`) → `decide` (Zod-validated structured output) → `validate` (engine; retry once with the error) → `fallback` (Hard heuristic bot on error or timeout).
- The LLM never mutates state; it only proposes an action from the legal set.
- **Prompt-injection safety:** player names, chat and any user text are passed as clearly delimited data, never as instructions; the bot cannot output anything except a legal action.
- Guards: 8s timeout, token limits, per-game call budget, global rate limit; degrade to heuristic bots if the API key is missing.
- Personas (e.g. "Cautious value investor", "Aggressive speculator"); a short reasoning "thought bubble" in the Market Tape after the move.
- **Market commentator:** after each reveal, one fictional headline per big mover, with a template fallback when AI is off.

---

## 10. UI/UX spec

Take inspiration from `docs/ui-reference/` (Richup.io landing and lobby, Colonist.io mode select and game layout, GeoGuessr dashboard) and `docs/reference/` (competitor tour). **Do not copy their assets, branding or code;** build an original look.

### Visual direction

- Dark navy/purple base; green for bull (up), red for bear (down); purple reserved for windfall cards.
- Rounded cards, soft glows, clean micro-animations (Motion). Respect `prefers-reduced-motion` plus an in-app setting.
- Indian number formatting everywhere (`Intl.NumberFormat('en-IN')` → ₹6,00,000), label in-game money as play money.
- Never rely on colour alone: pair with ▲/▼ and +/−.
- Sound effects (CC0 sources only, recorded in `THIRD_PARTY_NOTICES.md`) with a remembered mute toggle.
- Responsive and tested at 360, 768, 1024, 1280, 1366 and 1920 px. On phones: board and hand first, panels below, and a **sticky bottom bar** showing cash, net worth and the next action.
- Target **WCAG 2.2 AA**.

### Screens

1. **Landing (Richup-style):** logo and tagline, nickname input with 🎲, big **Play** button (quick-join a public room or start one with bots), **All rooms**, **Create private game**, **Join by code** and **👁 Watch**, login and sound in the corners, animated floating background icons (bull, bear, candlesticks, coins), a looping fake ticker tape along the bottom.
2. **Home for logged-in users (GeoGuessr-style):** left column of mode cards (Play vs Bots, Casual, Private game, greyed "Daily Challenge — coming soon"), centre avatar and stats, right recent matches and leaderboard highlights.
3. **Mode select (Colonist-style):** tabs Bots / Casual / Ranked (disabled, "coming soon"); Bots tab with Easy / Medium / Hard segmented control, player count, big **Start Game**.
4. **Room lobby (Richup-style):** room code + Copy code + Copy invite link; seat list with host crown, bot badges, remove ✕, "Watch instead / Take a seat"; settings panel (editable by host, read-only for others); chat; trading-floor preview with "Waiting for {host} to open the market…"; **Open the Market** (host only).
5. **Game screen:**
   - **Header:** room code, mode, Period X / N, Round r / 3, ← Home, sound.
   - **Phase strip:** Your turn / waiting · Trading → Veto → Suspend → Reveal.
   - **Left:** traders in turn order (avatar, bot/AFK badge, turn highlight with countdown ring), spectators list, **My Portfolio** (cash, share value, holdings) and **Pass**.
   - **Centre: the Big Board** — six company tiles with current price, last change ▲/▼, bank shares left (bar turns red under 15%), Chairman 👑 / Director names, insolvent badge, mini chart, Buy / Sell buttons.
   - **Bottom: My Cards** — 10 cards grouped by company with a private per-company "signal" total; playable windfalls glow with "Tap to play".
   - **Right:** **Market Tape** (every trade and event, e.g. "Arjun bought 5,000 Kuber Bank @ ₹25") and a separate **Table Chat** with emoji picker.
   - **Trade dialog:** company, price, your holding, bank shares left; quantity via 1K / 5K / 10K / Max chips and a slider; total cost and cash-after; unaffordable or unavailable options disabled with a reason.
   - **Company detail dialog:** one candle per Bargain Period (open/high/low/close), line/area toggle, opened / high-low / in bank / you hold.
   - **Interrupt dialogs** for rights offers, privilege choices and suspensions, each with a timer and default shown.
   - **First-game coach marks** (Colonist's "Place your first settlement" style).
6. **Reveal (the showpiece):** company by company, cards flip in, running sum ticks, withdrawn cards fly out labelled Chairman/Director, "SUSPENDED" stamp on frozen companies, a move pill (▼ −₹35 → ₹20), then the currency effect, then standings reshuffle. "Skip animation" option.
7. **Game over:** podium with a celebration animation, net-worth breakdown (cash / shares / total), price-history chart, net worth over time, seed reveal, **Rematch same table / Back to lobby / Home / Share result**.
8. **How to Play:** interactive rules in our own words with worked examples, including: cards +15, +10, +5, −10, −10, −5 → movement +5.
9. **Profile, match history and replay viewer** (event-log scrubber that rebuilds state at any point).
10. **Legal pages:** Privacy Policy, Terms of Use, Community Guidelines, and a Grievance contact (Section 12.3).

---

## 11. Collaboration and environments (two developers)

- **Local first:** each developer runs Postgres and Redis with `docker compose up -d` (ports bound to `127.0.0.1`, passwords from a git-ignored `.env`, named volumes) and runs the apps natively with `pnpm dev` for fast hot reload on Windows. Never share a development database.
- **CI from day one** on every pull request (Section 13).
- **Staging from the end of Milestone 3:** `main` auto-deploys to staging so both developers can play real games over the internet; staging uses its own secrets and database and never real user data.
- **Production at Milestone 7.**
- Branch per feature/milestone; pull requests require **one approving review** from the other developer plus green CI; squash merges; `CODEOWNERS` and a PR template with a security checklist.
- Split work along package boundaries where possible to avoid conflicts. Track tasks in GitHub Issues + a Projects board.
- Database migrations are generated with drizzle-kit, committed, reviewed in PRs, and never edited after merge.

### 11.1 Developer environment requirements (built in M0)

`docs/DEVELOPMENT.md` is the team's setup and workflow guide. Read it before planning M0, implement everything it describes, and keep it accurate whenever commands, ports or env variables change.

- **Naming:** product and repo are `stock-ex`. Workspace packages use the `@stock-ex/` scope: `@stock-ex/web`, `@stock-ex/server`, `@stock-ex/ai-worker`, `@stock-ex/engine`, `@stock-ex/shared`, `@stock-ex/db`, `@stock-ex/config`.
- **Pinned toolchain:** Node.js 26 (Active LTS from 28 Oct 2026; the committed `.nvmrc` says `26`) and pnpm 12. Set `engines` in the root `package.json` (`node >=26 <27`), `packageManager` pinning the exact pnpm 12.x version, and `engine-strict=true` in `.npmrc`. Docker images: `postgres:18-alpine`, `redis:8-alpine`.
- **One env file:** the root `.env` (copied from `.env.example`) is the only env file a developer edits. Every app loads it and validates it with Zod at start-up, failing with a clear message naming any missing or invalid variable.
- **Zero-account local dev:** the app must run locally with no third-party accounts. Emails are printed to the server console in development; Google sign-in is hidden when its keys are empty; Turnstile uses Cloudflare's official test keys; Sentry is disabled without a DSN; AI features are off unless `FEATURE_AI=true`.
- **Fixed local ports:** web 3000, server 4000, Postgres 5432, Redis 6379 (all bound to 127.0.0.1).
- **Root scripts** (names exactly as in `docs/DEVELOPMENT.md` section 6): `bootstrap`, `dev`, `build`, `lint`, `lint:fix`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`, `sim`, `healthcheck`. (Avoid `setup` and `doctor`: they are built-in pnpm commands and would shadow the scripts.)
  - `pnpm bootstrap` is idempotent: checks the Node and pnpm versions and that Docker is running, creates `.env` from `.env.example` if missing (generating random secrets), starts Docker services, waits until they are healthy, installs dependencies, runs migrations and seeds. It uses only Node built-ins so it runs before `pnpm install`.
  - `pnpm healthcheck` prints a pass/fail checklist: Node and pnpm versions, Docker running, Postgres and Redis reachable, `.env` valid, migrations up to date.
  - `pnpm db:reset` refuses to run unless `DATABASE_URL` points at localhost.
- **Cross-platform:** every script works on Windows PowerShell, macOS and Linux (Node scripts, not bash-only scripts).
- **Shared editor settings:** `.vscode/extensions.json` (recommended extensions), `.vscode/settings.json` (format on save, ESLint fix on save, workspace TypeScript), `.editorconfig`.
- **Claude Code (CLI and Desktop app):** commit `.claude/settings.json` (shared permissions and `.env` deny rules) and `.claude/launch.json` (starts the web app on port 3000 for the Desktop app's browser preview). `.claude/settings.local.json` and `.claude/worktrees/` are git-ignored. Team plugins (`typescript-lsp`, `security-guidance`, `code-review`, later `frontend-design`) are installed by the developers at project scope; don't add or remove plugins yourself. Every command and script must work when Claude runs it from the Desktop app, which may not load the user's shell profile.

---

## 12. Security, privacy and compliance baseline (built from Milestone 0)

### 12.1 OWASP Top 10:2025 controls

| Risk | Required controls |
|---|---|
| A01 Broken Access Control | Server-authoritative engine; identity only from verified tokens/sessions; per-event guard checks seat, turn and host role; `projectForPlayer` is the only way game state leaves the server; deny by default; the server never fetches user-supplied URLs. |
| A02 Security Misconfiguration | helmet headers; strict CSP with nonces in Next.js; HSTS; CORS and Socket.IO origin allowlist; `x-powered-by` off; no debug/admin UIs in production; databases on private networks with TLS and passwords; Zod-validated env at boot (fail fast). |
| A03 Software Supply Chain Failures | Committed lockfile; `--frozen-lockfile` in CI; pnpm install-script blocking kept on; Dependabot; `pnpm audit`; dependency-review action; GitHub Actions pinned to commit SHAs; minimal dependencies. |
| A04 Cryptographic Failures | HTTPS everywhere; Better Auth password hashing; secure cookies; secrets ≥ 32 random bytes; `node:crypto` for seeds, room codes, IDs and tokens. |
| A05 Injection | Drizzle parameterised queries only; Zod on every input with length limits; React escaping; no `dangerouslySetInnerHTML`; LLM inputs delimited and outputs restricted to legal actions. |
| A06 Insecure Design | `docs/THREAT_MODEL.md` from M0, updated each milestone; per-room queue + `stateVersion` + idempotency keys; limits on rooms and bots per IP/user. |
| A07 Authentication Failures | Rate-limited sign-in, email verification, session rotation, server-side logout, Turnstile, short-lived socket tokens re-verified on reconnect, no tokens in localStorage. |
| A08 Software/Data Integrity Failures | Protected `main`; deploys only from CI; reviewed migrations; append-only event log; Zod-validated job payloads. |
| A09 Logging & Alerting Failures | pino structured logs for security events (failed logins, rate-limit hits, illegal-action attempts, kicks); redaction of tokens, passwords, emails; Sentry alerts; uptime monitor on `/health`. |
| A10 Mishandling Exceptional Conditions | Engine actions all-or-nothing; global exception filter returning generic errors without stack traces; timeouts on all external calls; unhandled-rejection handling; graceful shutdown with snapshots. |

### 12.2 Real-time specifics

- Reject socket connections without a valid token or from an unknown origin.
- Small `maxHttpBufferSize`; Zod on every event; rate limits per socket, per user and per IP (starting points: 60 events / 10 s, 8 chats / 10 s, 20 rooms or bots / min, 40 connections / min per IP); disconnect abusive sockets.
- Spectators receive only the public projection. Timers are server-owned.
- `TRUST_PROXY` setting so real client IPs are used only behind a known proxy.

### 12.3 Privacy (India DPDP Act 2023 + DPDP Rules 2025, GDPR-ready)

Most DPDP obligations apply from 13 May 2027; we comply by design now.

- **Minimisation:** guests store nothing personal. Accounts store email, display name, password hash or Google ID, avatar choice, age confirmation timestamp, game history. No phone, birth date, location or contacts.
- **Notice and consent:** plain-language Privacy Policy itemising each data field, purpose, how to withdraw consent, how to exercise rights and how to complain to the Data Protection Board; shown at sign-up as a clear, unbundled action. Optional processing (e.g. analytics) gets a separate choice.
- **Rights:** self-service export, correction and deletion (Section 8); a published grievance contact email.
- **Children:** accounts are 18+ only; no ads, no behavioural tracking or profiling for anyone.
- **Cookies:** only strictly necessary cookies (session). No cookie banner needed unless that changes; any future analytics must be cookieless and added to the policy first.
- **Retention:** security logs and related traffic data kept at least 1 year then deleted; accounts inactive 3 years deleted after advance email notice (scheduled job); finished guest games anonymised.
- **Breach readiness:** `docs/INCIDENT_RUNBOOK.md` covering notification to the Board without delay, a detailed report within 72 hours, and notifying affected users by email.
- **Processors:** list every vendor touching personal data (hosting, database, email, Sentry) in `docs/DATA_INVENTORY.md`; Sentry and logs must scrub PII.

### 12.4 Legal and IP

- No real-money stakes, purchases of in-game currency, cash-outs or prizes of value.
- Original names, art and rules text; third-party assets only with clear licences, recorded in `THIRD_PARTY_NOTICES.md`.
- `LICENSE` file chosen at M0 (ask us: MIT or all rights reserved).
- Privacy Policy, Terms and Community Guidelines ship with M4, before accounts go live, with a note that they need legal review before any commercial launch.

---

## 13. Developer workflow and CI

- **Pre-commit (Husky + lint-staged):** format, lint, typecheck affected packages, gitleaks on staged files.
- **CI on every PR (GitHub Actions):**
  1. Install with frozen lockfile (cached).
  2. Lint and typecheck all packages.
  3. Unit + property tests.
  4. Build all apps.
  5. Integration tests against Postgres and Redis service containers.
  6. Playwright E2E + axe accessibility checks.
  7. Security: `pnpm audit --audit-level high`, dependency-review action, gitleaks over the diff; CodeQL once the repo is public.
- **On merge to `main`:** run migrations as a separate step with the migration role, then deploy to staging (from M3) or production (M7).
- **Claude Code project settings** (`.claude/settings.json`, committed): deny rules preventing reading `.env*` files and other secrets; allow rules for routine commands (`pnpm lint`, `pnpm test`, etc.).

---

## 14. Quality bar

- **Engine:** every rule in Section 4 unit-tested, including insufficient cash, supply cap, insolvency and recovery, chairman ties, one withdrawal per company, rights-issue rounding and supply exhaustion, currency rounding to ₹5,000, debenture legality, timeouts. **Property tests** over random bot games: cash ≥ 0, prices ≥ 0, total shares per company ≤ 2,00,000, money conserved except logged bank flows, and `replay(seed, log)` equals live state. ≥ 90% line coverage for `packages/engine`.
- **Server:** gateway integration tests with real Socket.IO clients and test Redis. **Projection-leak tests:** no other player's hand, the deck or the seed ever appears in any payload before it should. Authorization tests: out-of-turn, non-host and spoofed-identity actions are rejected. Concurrency test: two simultaneous buys cannot overspend.
- **E2E (Playwright):** two browser contexts create and join a private room and play a 1-period game to completion; a spectator joins; reconnection mid-turn; account sign-up, export and delete.
- **Accessibility:** axe passes on landing, lobby, game, How to Play and legal pages; keyboard-operable actions; focus management in dialogs; ARIA live region for turns and price changes.
- **Load:** an Artillery scenario for N concurrent rooms; record results in `docs/DEPLOYMENT.md`.

---

## 15. DevOps

- `docker compose up -d` runs Postgres and Redis for development; apps run with `pnpm dev`. A `full` Compose profile (`docker compose --profile full up --build`) runs web, server and worker from their production Dockerfiles, to test production-like builds before deploying.
- Health endpoints, structured logs, Sentry, uptime monitoring, graceful shutdown.
- Managed database daily backups; document and test one restore before production.
- `docs/DEPLOYMENT.md`: step-by-step staging and production setup, environment variables, domains, and rollback.

---

## 16. Milestones and acceptance criteria

**M0: Secure scaffold**
- Monorepo with `@stock-ex/*` packages, pinned toolchain, root scripts and developer environment from Section 11.1, shared configs, docker-compose, Zod env validation, CI with security checks, Husky/lint-staged/gitleaks, Dependabot, branch-protection instructions, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `.env.example`, first `THREAT_MODEL.md` and `DATA_INVENTORY.md`, Claude Code deny rules.
- *Done when:* on a fresh clone, `pnpm bootstrap` then `pnpm dev` boots all apps on Windows and macOS/Linux, `pnpm healthcheck` passes, CI is green, and a commit containing a fake secret is blocked.

**M1: Engine + heuristic bots + simulator**
- Full Section 4 rules, deck, state machine, projection, event log and replay, bots, CLI simulator.
- *Done when:* all engine and property tests pass, 1,000 simulated 6-player games finish without errors, and Hard beats Easy in > 60% of games.

**M2: Game server**
- Rooms, codes, spectators, sockets, per-room queue, idempotency, timers, reconnection + AFK takeover, rematch, Redis snapshots with TTL, adapter, rate limits, bots via BullMQ, chat with mute/report.
- *Done when:* socket integration, projection-leak, authorization and concurrency tests pass.

**M3: Playable web app + staging**
- Landing, mode select, lobby and game screen (functional styling is fine); guest play vs bots and private rooms end to end; staging deployment from `main`.
- *Done when:* the Playwright multiplayer test passes locally and both developers finish a game against each other on staging.

**M4: Accounts, privacy and persistence**
- Better Auth, 18+ confirmation, Turnstile, email verification, profiles, export and delete, inactive-account job, match history, replay viewer, stats, leaderboards, Privacy Policy, Terms, Community Guidelines, grievance contact.
- *Done when:* a finished game appears in history and replays correctly; export and delete work end to end.

**M5: Polish**
- Full visual design, reveal animation, sounds, coach marks, responsive layouts at all six widths, accessibility, How to Play, company candle charts.

**M6: AI**
- LangGraph bot and market commentator behind a feature flag, with cost and latency guards, prompt-injection safety and fallback.
- *Done when:* AI bots finish full games with 0 illegal moves reaching the engine.

**M7: Ship**
- Production deployment, Sentry, uptime monitoring, backup restore tested, Artillery load test, README with architecture diagram, GIF/screenshots, live demo link and "what we learned".

---

## 17. Non-goals (do not build)

- Real money of any kind: store, virtual-currency purchases, payments, ads.
- Real market data or real company names/logos.
- Extra game modes (Flash Market is the candidate for later), Daily Challenge, trader-to-trader deals (design so they can be added later).
- Friends system, clubs, native mobile apps, ranked ELO matchmaking (design for it, don't build it).

---

## 18. First response we expect from you

1. A summary of your understanding of the rules, flagging anything still ambiguous.
2. The implementation plan for M0–M1: file tree, key types (`GameState` and `Action` unions), the test list, and the M0 security setup.
3. Questions for us (including the `LICENSE` choice).

Do not write code until we approve the plan.
