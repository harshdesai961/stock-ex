# **Stock Exchange Game — Tech Stack, Tooling & Security Baseline** 

Oct 7, 2026 · @Harsh 

## **Overview** 

We build one TypeScript monorepo: a Next.js web app, a NestJS real-time game server and a pure gameengine package, backed by PostgreSQL and Redis, with security and privacy controls in place from the first commit. This doc is the reference for what each tool is, how we use it, why it is current practice, and the security and compliance baseline we will not have to retrofit later. 

### **Guiding principles** 

1. **The server is the only source of truth.** Clients send intents; the server validates, applies and broadcasts. Hidden cards never leave the server before the reveal. 

2. **One language end to end.** TypeScript in strict mode everywhere, with Zod schemas shared by client and server, so one change is type-checked across the whole system. 

3. **Secure and private by default.** Collect the least data, grant the least privilege, keep secrets out of code, validate every input. Security is a day-one requirement, not a final milestone. 

4. **Mainstream over novel.** Choose tools that hiring teams use and that have strong docs, so every choice is easy to defend in an interview. 

5. **Reproducible everywhere.** Docker for services, a committed lockfile, a seeded deterministic engine and CI on every push. 

6. **Scope discipline.** Classic mode, polished and tested, before any extra mode, store or monetisation. 

### **Architecture at a glance** 



<!-- Start of picture text -->
The game server owns every game; browsers only send intents<br>Hidden cards and the deck order never leave the game server before the reveal<br>Web app: Nextjs PostgreSQL<br>Pages, sign-in, REST APIs Accounts, finished games,<br>Hosted on Vercel event log, stats<br>HTTPS<br>Player's browser<br>React Ul, Zustand store wss|<br>Sends intents only Game server - NestuS Redis<br>Socket.IO rooms and timers Live snapshots, pub/sub,<br>Per-room action queue queues, rate limits<br>Pure engine decides every rule<br>BulIMQ jobs<br>Alworker- LangGraph<br>Bot turns via BulIMQ<br>Feature-flagged, budgeted<br><!-- End of picture text -->

System architecture · 6 components 

Browsers reach the web app over HTTPS and the game server over a secure WebSocket; only the game server reads or writes live game state, and it alone talks to Redis for live play. 

### **Versions** 

We always install the latest stable release of each tool at project start and pin it in the lockfile. This doc avoids hard version numbers on purpose: check each project's official site when you begin, and record the chosen versions in <mark>docs/DECISIONS.md</mark> . 

## **Tech stack by layer** 

Every tool below earns its place by doing a job no other tool in the stack already does. Each table lists what the tool is, how this project uses it, and why it is current practice; alternatives we considered sit under each table. 

### **Foundation: language, monorepo, validation** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|TypeScript (strict mode)|All code in every app and<br>package.<br>strict,<br>noUncheckedIndexedAccess<br>and|The default for professional<br>JavaScript work. Catches whole<br>classes of bugs before runtime<br>and is listed in most web job|
||exactOptionalPropertyTypes|descriptions.|



|Tool|How we use it|Why it is current practice|
|---|---|---|
||on.||
|Node.js (Active LTS line)|Runtime for the game server, AI<br>worker, scripts and tooling.|LTS releases get security<br>patches for years. Same<br>language as the browser, so one<br>skill set covers the stack.|
|pnpm workspaces|Installs dependencies and links<br>our internal packages together.|Fast and disk-efficient. Its strict<br>layout blocks "phantom"<br>dependencies a package never<br>declared, which is also a supply-<br>chain safeguard.|
|Turborepo|Runs build, lint, typecheck and<br>test across all packages, with<br>caching.|The standard task runner for<br>TypeScript monorepos. Only re-<br>runs what changed, so CI stays<br>fast.|
|Zod|One schema per boundary:<br>socket events, REST bodies,<br>environment variables,<br>database JSON, LLM output.|TypeScript types disappear at<br>runtime; Zod checks real data<br>and produces the type from the<br>same schema. Shared schemas<br>keep client and server in<br>lockstep.|
|ESLint + Prettier|Lint rules (including security and<br>React-hooks plugins) and<br>consistent formatting.|Still the most widely used pair,<br>with the largest plugin<br>ecosystem.|



_Considered:_ Biome instead of ESLint + Prettier (faster, one tool) — kept ESLint for its security and React plugins. Nx instead of Turborepo — more powerful, heavier than we need. 

### **Web app** **<mark>(apps/web</mark> )** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|Next.js (App Router) + React|All pages: landing, lobby, game<br>table, profile, How to Play,<br>Privacy. Server-rendered public<br>pages for SEO; route handlers<br>for REST (history, profile,<br>leaderboards) and auth.|The most widely used React<br>framework. Server Components<br>keep secrets and heavy work off<br>the client.|
|Tailwind CSS|Styling through design tokens<br>(colours, spacing, type) defined<br>once.|The dominant styling approach<br>in new React projects;<br>consistent design without CSS|



|Tool|How we use it|Why it is current practice|
|---|---|---|
|||naming debates.|
|shadcn/ui on Radix primitives|Dialogs (trade ticket), tabs,<br>tooltips, menus, toasts.|Components are copied into our<br>repo, so we own them. Radix<br>handles focus, keyboard and<br>screen-reader behaviour, which<br>gives accessibility for free.|
|Zustand|Client store for the live game<br>state pushed by the server.|Tiny and boilerplate-free; a<br>good fit for event-driven<br>updates from a socket.|
|TanStack Query|Fetching and caching REST data:<br>match history, profile,<br>leaderboards.|The standard way to manage<br>server data in React (loading,<br>caching, refetching).|
|Motion (formerly Framer<br>Motion)|Card dealing, the reveal<br>sequence, price ticks. Honours<br>the reduced-motion setting.|The most used React animation<br>library.|
|TradingView Lightweight Charts|One candle per Bargain Period,<br>net-worth lines on Game Over.|Purpose-built financial charts,<br>small and fast. Its licence asks<br>for attribution; follow it.|
|socket.io-client|The real-time connection, with<br>automatic reconnection.|Pairs with the Socket.IO server<br>below.|



_Considered:_ Remix / React Router framework mode (good, smaller ecosystem); Redux Toolkit instead of Zustand (more ceremony than this app needs); a hand-built SVG chart like your friend's (impressive, but weeks of work a library already does). 

## **Tools and software requirements** 

A Windows 10 or 11 laptop with 16 GB of RAM is comfortable for this project; 8 GB works if you close other apps while Docker runs. Everything below is free except Claude Code and production hosting. 

### **Install on your machine** 

|Tool|Purpose|Notes|
|---|---|---|
|WSL 2|Linux layer that Docker Desktop<br>runs on|Enable when Docker asks;<br>reboot once.|
|Git for Windows|Version control; also gives|Set your name, email and|
||Claude Code its Bash tool|default branch<br>main.|
|GitHub CLI(<br>gh)|Create repos andpull requests|Login with<br>gh auth login.|



|Tool|Purpose|Notes|
|---|---|---|
||from the terminal||
|Node.js (Active LTS)|Runs everything JavaScript|Use the official installer, or<br>fnm<br>if you want to switch versions<br>later.|
|pnpm|Package manager for the<br>monorepo|Install using pnpm's official<br>instructions.|
|Docker Desktop|Runs Postgres and Redis locally|Free for personal use and small<br>businesses.|
|VS Code|Editor|Extensions listed below.|
|Claude Code|AI pair programmer in the<br>terminal|Needs a Pro plan or higher.|
|Redis Insight|Look inside Redis: room<br>snapshots, queues, rate-limit<br>keys|Free GUI from Redis.|
|Drizzle Studio|Browse Postgres tables|Comes with drizzle-kit; or use<br>DBeaver.|
|Chrome and Firefox|Manual testing in two engines|Playwright downloads its own<br>test browsers.|
|Bitwarden (or any password<br>manager) + an authenticator<br>app|Store secrets and turn on two-<br>factor for every account|Never keep secrets in notes or<br>chat.|



### **VS Code extensions** 

- ESLint and Prettier — show lint errors and format on save 

- Tailwind CSS IntelliSense — class name completion 

- Container Tools (Docker) — see running containers and logs 

- Playwright Test for VS Code and Vitest — run and debug tests from the editor 

- Pretty TypeScript Errors and Error Lens — readable type errors, inline 

- Claude Code for VS Code — optional, shows Claude's edits as diffs in the editor 

### **Accounts and services** 

|Service|Needed from|Used for|Cost|
|---|---|---|---|
|GitHub (two-factor on)|Day 1|Code, pull requests, CI,<br>Dependabot, secret<br>scanning|Free|



|Service|Needed from|Used for|Cost|
|---|---|---|---|
|Claude (Pro or higher)|Day 1|Claude Code|Paid|
|Google Cloud Console|Milestone 4|OAuth client for "Sign<br>in with Google"|Free|
|Resend, Postmark or<br>similar|Milestone 4|Verification and<br>password-reset emails|Free tier|
|Vercel|Milestone 7|Host the web app|Free hobby tier (non-<br>commercial use)|
|Railway, Render or<br>Fly.io|Milestone 7|Host game server and<br>AI worker|Small monthly fee or<br>trial credits|
|Managed Postgres and<br>Redis|Milestone 7|Production data|Free or low-cost tiers|
|Cloudflare|Milestone 7|Domain DNS, TLS,<br>DDoS protection,<br>Turnstile|Free|
|Sentry|Milestone 2|Error tracking|Free developer tier|
|A domain name|Milestone 7|A professional demo<br>link|Small yearly fee|
|LLM API key|Milestone 6|AI bot and<br>commentator|Pay per use; set a hard<br>monthly spending limit<br>on day one|



## **Security baseline from day one** 

We map every control to the OWASP Top 10:2025, the current industry reference for web application risk, and build each one in the milestone where its code first appears. Nothing on this list is left for a "security pass" at the end. 

|OWASP 2025 risk|Where it bites this game|Controls we build in|
|---|---|---|
|A01 Broken Access Control|Acting out of turn, reading<br>another player's hand, a non-<br>host changing settings, viewing<br>someone else's private data.|Server-authoritative engine. The<br>user ID always comes from the<br>session, never from the<br>message. A guard on every<br>socket event checks seat, turn<br>and host role.<br>projectForPlayer<br>is the only way state leaves the<br>server, and tests assert no<br>hidden card ever appears in|



|OWASP 2025 risk|Where it bites this game|Controls we build in|
|---|---|---|
|||another player's payload. The<br>server never fetches user-<br>supplied URLs.|
|A02 Security Misconfiguration|Open CORS, missing headers,<br>exposed Redis or Postgres,<br>debug tools left on.|helmet headers, a strict Content<br>Security Policy with nonces,<br>HSTS. CORS and the Socket.IO<br>origin check allow only our<br>domain. Databases on private<br>networks with passwords and<br>TLS. Admin and debug UIs off in<br>production. Environment<br>variables validated by Zod at<br>boot, so a missing secret stops<br>the app instead of running<br>insecurely.|
|A03 Software Supply Chain<br>Failures|A malicious or hijacked npm<br>package, or a package name an<br>AI invented.|Committed lockfile,<br>pnpm<br>install --frozen-lockfilein CI,<br>Dependabot alerts,<br>pnpm audit<br>in CI, few dependencies. pnpm's<br>blocking of install scripts kept<br>on. GitHub Actions pinned to<br>commit SHAs. Every new<br>package checked by hand: real,<br>maintained, popular.|
|A04 Cryptographic Failures|Weak password storage, tokens<br>sent in clear text, guessable<br>room codes or seeds.|HTTPS everywhere. Password<br>hashing by Better Auth. Secure,<br>httpOnly, SameSite cookies.<br>Secrets of at least 32 random<br>bytes.<br>node:cryptofor seeds,<br>room codes and tokens.<br>Encryption at rest from the<br>managed database provider.|
|A05 Injection (including XSS)|SQL injection, script injection<br>through chat or nicknames,<br>prompt injection into the AI bot.|Parameterised queries through<br>Drizzle. Zod on every input, with<br>length limits on names and<br>chat. React escaping; no<br>dangerouslySetInnerHTML.<br>The AI bot treats player names<br>and chat as quoted data and<br>mayonly pick from the engine's|



|OWASP 2025 risk|Where it bites this game|Controls we build in|
|---|---|---|
|||legal actions.|
|A06 Insecure Design|Race conditions on cash, bot<br>farming, room spam, rejoin<br>exploits.|A short threat model written at<br>Milestone 0 and updated each<br>milestone. Per-room action<br>queue plus<br>stateVersion.<br>Idempotency keys on actions.<br>Limits on rooms and bots per IP<br>and per user.|
|A07 Authentication Failures|Credential stuffing, stolen<br>sessions, fake sign-ups.|Better Auth with rate-limited<br>sign-in, email verification,<br>session rotation on login,<br>server-side logout. Socket<br>tokens expire in minutes and<br>are re-checked on reconnect.<br>Turnstile on sign-up. No tokens<br>in localStorage.|
|A08 Software or Data Integrity<br>Failures|An unreviewed change reaching<br>production, tampered game<br>history.|Protected<br>mainbranch; deploys<br>only from CI after all checks<br>pass. Migrations reviewed in<br>pull requests. Game event log is<br>append-only. Every queued job<br>payload is validated before use.|
|A09 Security Logging and<br>Alerting Failures|An attack nobody notices, or<br>logs that leak personal data.|Structured pino logs for security<br>events: failed logins, rate-limit<br>hits, illegal-action attempts.<br>Redaction of tokens, passwords<br>and emails. Sentry alerts and an<br>uptime monitor on<br>/health.|
|A10 Mishandling of Exceptional<br>Conditions|A crash halfway through an<br>action that leaves cash<br>deducted but shares not given.|Fail closed: the engine either<br>applies a whole action or none<br>of it. A global exception filter<br>returns generic errors with no<br>stack traces. Timeouts on every<br>external call. Graceful shutdown<br>snapshots live games to Redis.|



### **Real-time and fair-play specifics** 

- **Socket handshake:** reject connections without a valid short-lived token or from an unknown origin. 

- **Message limits:** a small maximum message size, Zod on every event, per-socket and per-IP event rate limits; abusive sockets are disconnected. 

- **Hidden information:** the deck order and seed never leave the server until Game Over; spectators receive only the public projection. 

- **Timers belong to the server:** clients display countdowns but cannot extend or skip them. 

- **Bots are always labelled** with a badge, and an AFK seat shows that a bot is playing it. 

## **Privacy and legal compliance** 

We build a free online social game with no real-money stakes, designed to India's DPDP Act and Rules today even though most obligations apply only from 13 May 2027. The same design covers most of what GDPR would ask if users arrive from Europe. This section is engineering guidance, not legal advice; have a lawyer review the Privacy Policy and Terms before any commercial launch. 

### **Online gaming law: stay a "social game"** 

India's <u>Promoton and Regulati on of Online Gaming Act, 2025i</u> bans online money games and their advertising, while allowing e-sports and online social games. Reports on the final rules say registration for social games is voluntary, and that social games may earn through subscriptions but cannot pay out to users (Storyboard18, March 2026). 

Design rules that keep us clearly on the social-game side: 

- In-game rupees are play money only, labelled as such in the UI, with no way to buy them or cash them out. 

- No entry fees, prizes with cash value, wagers, or anything convertible to money or crypto. 

- If cosmetics are ever sold, they never change cash, cards, turns or odds. 

### **DPDP Act 2023 and DPDP Rules 2025** 

The Rules were notified on 13 November 2025 and phase in over 18 months (Hogan Lovells summary): 

|Effective|What applies|
|---|---|
|13 Nov 2025|Definitions, the Data Protection Board,<br>investigations and appeals|
|13 Nov 2026|Registration of consent managers|
|13 May 2027|Notice and consent, security safeguards, breach<br>notification, retention, children's data, user rights|



How we meet each obligation by design: 

|Obligation|Our design|
|---|---|
|Data minimisation|Guests: a nickname only. Accounts: email, display|
|i|name, password hash or Google ID, avatar choice,|
||game history. Nophone number,birth date,|



|Obligation|Our design|
|---|---|
||location or contacts.|
|Notice|A plain-language Privacy Policy that itemises each<br>piece of data, its purpose, how to withdraw<br>consent, how to exercise rights and how to<br>complain to the Board. Shown at sign-up,<br>separate from other text.|
|Consent|A clear, unbundled action at sign-up. Anything<br>optional (such as analytics) gets its own choice.<br>Withdrawing is as easy as giving: a "Delete my<br>account" button.|
|User rights|Self-service data export, name correction and<br>account deletion. On deletion, personal data is<br>erased and game history is anonymised. A<br>published grievance contact.|
|Children|The Rules require verifiable parental consent<br>before processing a child's data (under 18 in<br>India) and restrict tracking and targeted<br>advertising of children. We therefore make<br>accounts 18+ with an age confirmation, keep<br>guest play free of personal data, and run no ads<br>or behavioural tracking for anyone.|
|Security safeguards|The controls in the security baseline above:<br>encryption in transit and at rest, access control,<br>monitoring, backups, logging.|
|Breach notification|A written incident runbook: tell the Board<br>without delay, send a detailed report within 72<br>hours, and notify affected users through their<br>registered email.|
|Retention|Keep security logs and related traffic data for at<br>least one year, as the Rules require, then delete.<br>As good practice, delete accounts inactive for<br>three years after advance notice (the Rules<br>mandate this only for large platforms).|
|Processors and transfers|Keep a list of every vendor that touches personal<br>data (hosting, database, email, Sentry) and<br>accept their standard data processing terms.<br>Prefer regions in or near India.|



### **GDPR readiness** 

The choices above already give data minimisation, clear notice, easy deletion and export. We set only strictly necessary cookies (the session cookie), which do not need a cookie banner. If analytics are added, use a cookieless, privacy-friendly tool and update the Privacy Policy first. 

### **Intellectual property and licences** 

- **Original game identity:** don't reuse the board game's name, logo, card art or manual text. Rules are re-explained in our own words; company names are fictional, with no real logos. 

- **Third-party assets:** only clearly licensed assets (for example CC0 sounds, OFL fonts), each recorded in a <mark>THIRD_PARTY_NOTICES.md</mark> file. 

- **Project licence:** choose one on day one (MIT if you want others to learn from it, or "all rights reserved") and add a <mark>LICENSE</mark> file. 

- **Your employer:** build only on personal time and personal devices, and check your employment contract's IP clause before publishing. 

### **Pages and policies** 

Privacy Policy, Terms of Use, and a short Community Guidelines page (no harassment in chat), plus mute and report buttons in chat. All three pages ship with Milestone 4, before accounts go live. 

## **Secure development workflow** 

Security is enforced by the pipeline, not by memory: a change reaches <mark>main</mark> only after automated checks pass, and production deploys only from <mark>main</mark> . 

### **Branch rules on GitHub** 

- <mark>main</mark> is protected: pull request required, all status checks must pass, no force pushes, squash merges. 

- One branch per milestone or feature; you review every diff Claude Code produces before merging. 

### **Before each commit (Husky + lint-staged)** 

1. Format and lint the changed files. 

2. Type-check the affected packages. 

3. Scan staged files for secrets with gitleaks; the commit is blocked if one is found. 

### **CI pipeline on every pull request (GitHub Actions)** 

1. Install with the frozen lockfile. 

2. Lint and type-check every package. 

3. Unit and property tests (Vitest, fast-check). 

4. Build every app. 

5. Integration tests against Postgres and Redis service containers. 

6. Playwright end-to-end tests with axe accessibility checks. 

7. Security checks: <mark>pnpm audit</mark> (fail on high severity), GitHub's dependency-review action, gitleaks over the full diff, and CodeQL code scanning once the repo is public (free for public repos). 

8. On merge to <mark>main</mark> : deploy web, server and worker; run database migrations as a separate step. 

### **Secrets** 

- <mark>.env</mark> files are git-ignored. A committed <mark>.env.example</mark> lists every variable with dummy values. 

- • Production secrets live only in the hosting platforms' secret stores and GitHub Actions secrets. Each environment (local, preview, production) has its own values. 

- A leaked secret is rotated immediately, never just deleted from Git history. 

- The app's database user can read and write data but cannot drop or alter tables; migrations run with a separate role. 

- Never paste real secrets into Claude, Claude Code or any chat. Add deny rules in Claude Code's project settings so it cannot read <mark>.env</mark> files. 

### **Dependencies** 

Before adding any package, check that it exists, is actively maintained, is widely used and has a compatible licence; AI tools sometimes suggest packages that don't exist. Dependabot opens grouped weekly update pull requests; read the changelog before merging. 

### **Project documents that live in the repo** 

|File|Purpose|
|---|---|
|SECURITY.md|How to report a vulnerability to you|
|docs/THREAT_MODEL.md|What we protect, from whom, and how; updated<br>each milestone|
|docs/INCIDENT_RUNBOOK.md|Steps and contacts for a breach, including the 72-<br>hour report|
|docs/DATA_INVENTORY.md|Every piece of personal data, its purpose, where<br>it lives, who processes it, how long it is kept|
|docs/DECISIONS.md|Why each tool and rule was chosen (also great<br>interview prep)|
|THIRD_PARTY_NOTICES.md|Licences of fonts, sounds and libraries we ship|



### **Backups** 

Use the managed database's daily backups, and test a restore once before launch: a backup never restored is only a hope. 

## **Day-one checklist and what we defer** 

These are the Milestone 0 tasks that make every later milestone secure by default; tick them off as you go. 

- ☐ Turn on two-factor authentication for GitHub, Google, Claude and every hosting account 

- ☐ Create the private repo; protect <mark>main</mark> (pull requests, required checks, no force push) 

- ☐ Commit <mark>.gitignore</mark> , <mark>.env.example</mark> , <mark>LICENSE</mark> , <mark>SECURITY.md</mark> and the lockfile 

- ☐ Add Zod validation of environment variables at app start-up 

- ☐ Set up Husky + lint-staged + gitleaks pre-commit hooks 

- ☐ Create the CI workflow with lint, typecheck, tests, audit and secret scanning; pin actions to commit SHAs 

- ☐ Enable Dependabot alerts and grouped weekly updates 

- ☐ Add Claude Code deny rules for <mark>.env</mark> files 

- ☐ Write the first <mark>docs/THREAT_MODEL.md</mark> and <mark>docs/DATA_INVENTORY.md</mark> (one page each) 

- ☐ Set a hard monthly spending limit on every paid account 

### **Deliberately deferred** 

- **Store, virtual currency, payments and ads** — out of scope; they add payment-law and consent work without adding hiring value. 

- **Extra game modes** — Classic first; Flash Market is the best candidate for a second mode. 

- **Ranked matchmaking and ELO** — designed for, built later. 

- **Two-factor sign-in for players** — Better Auth supports it; add after launch. 

- **CodeQL and GitHub push protection** — switch on when the repo goes public. 

## **Sources** 

- <u>OWASP Top 10:2025</u> 

- <u>Auth.js is now part of Beter Autht</u> 

- <u>India's DPDP Act 2023 brought into force — Hogan Lovells</u> 

- <u>Summary: Promotion and Regulation of Online Gaming Act, 2025 — Mondaq</u> 

- <u>Online gaming rules eased: social games registration voluntary — Storyboard18</u> 

- <u>Claude Code advanced setup</u> 

### **Game server** **<mark>(apps/server</mark> ) and engine (** **<mark>packages/engine</mark> )** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|NestJS|Modules for rooms, games,|Structured MVC-style|
||bots, health and admin; guards<br>for auth; pipes for Zod|architecture with dependency<br>injection, familiar from|
||validation; a WebSocket<br>gateway.|CodeIgniter, and common in<br>enterprise Node job listings.|
|Socket.IO|Rooms, acknowledgements,|The most mature real-time|



|Tool|How we use it|Why it is current practice|
|---|---|---|
||reconnection with connection-<br>state recovery, per-player state<br>pushes.|library for Node, with rooms<br>and reconnection built in rather<br>than hand-written on raw<br>WebSockets.|
|@socket.io/redis-adapter|Broadcasts reach players<br>connected to any server<br>instance.|The documented way to scale<br>Socket.IO horizontally.|
|Per-room action queue|Every action for a room runs<br>one at a time, plus a<br>stateVersioncheck, so two fast<br>clicks can never spend the same<br>cash.|Serialising writes per aggregate<br>is standard practice for<br>multiplayer and financial<br>systems (adopted from your<br>friend's design).|
|BullMQ|Background jobs: bot turns, turn<br>timeouts, saving finished<br>games, stats, AI calls; retries<br>with backoff.|The standard Redis-backed job<br>queue for Node; jobs survive<br>restarts.|
|Pure TypeScript engine|All rules as pure functions:<br>applyAction,<br>getLegalActions,<br>projectForPlayer. No network,<br>database or framework code.|Pure, deterministic logic is the<br>easiest code to test, replay and<br>reason about; it is the heart of<br>the project's interview story.|
|Seeded PRNG +<br>node:crypto|A cryptographically random<br>seed per game, then a seeded<br>generator for shuffles. The seed<br>stays secret until Game Over.|Fair (unpredictable) and<br>reproducible (replays, tests,<br>Daily Challenge) at the same<br>time.|
|pino|Structured JSON logs with<br>automatic redaction of tokens,<br>passwords and emails.|Fastest Node logger; JSON logs<br>are what log platforms expect.|
|helmet, CORS allowlist,<br>@nestjs/throttler|Security headers on HTTP<br>routes, only our web origin<br>allowed, rate limits per IP and<br>per user.|Baseline hardening expected of<br>any public Node API.|



_Considered:_ Express (simpler; your friend's choice) — fine, but less structure to show; Colyseus (a gameserver framework) — less to learn by building it ourselves; raw ws — we would rebuild rooms and reconnection by hand. 

|**Data**|||
|---|---|---|
|Tool|How we use it|Whyit is currentpractice|



|PostgreSQL|Accounts, sessions, finished<br>games, the full event log<br>(JSONB), stats, leaderboard<br>snapshots.|The most used database among<br>professional developers; ACID<br>transactions, strong constraints<br>and JSONB in one engine. Many<br>app servers can share it, unlike<br>a SQLite file.|
|---|---|---|
|Drizzle ORM + drizzle-kit|Schema written in TypeScript;<br>type-safe, SQL-like queries;<br>migrations generated and<br>committed to Git.|Thin and close to SQL, so you<br>learn real SQL. Every query is<br>parameterised, which blocks<br>SQL injection.|
|Redis (or Valkey)|Live game snapshots with a TTL,<br>Socket.IO pub/sub, rate-limit<br>counters, leaderboard sorted<br>sets, BullMQ storage.|The standard in-memory store.<br>Valkey is the open-source, drop-<br>in compatible fork; either works<br>with the same code.|



_Considered:_ Prisma (popular; heavier, hides more SQL); SQLite (fine for one server, blocks horizontal scaling); MongoDB (our data is relational: users, games, players, events). 

### **Identity** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|Better Auth|Email + password and Google<br>sign-in; sessions stored in<br>Postgres; httpOnly, Secure,<br>SameSite cookies; built-in rate<br>limits on auth routes; optional<br>two-factor later.|Auth.js (formerly NextAuth) is<br>now maintained by the Better<br>Auth team, which recommends<br>Better Auth for new projects<br>(announcement<br>).|
|jose|Short-lived (about 5 minutes)<br>signed tokens that the web app<br>hands to the socket connection.|Standard, dependency-free JWT<br>library. Short lifetimes limit the<br>damage of a leaked token.|
|Guest sessions|A signed guest token tied to a<br>nickname only; no email, no<br>stored personal data.|Lets people play instantly while<br>collecting nothing.|



### **AI (Milestone 6, behind a feature flag)** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|LangGraph.js|The AI bot as a graph: observe|The leading framework for|
||its own projection, call tools|stateful, multi-step agents in|
||(expectedprice moves,legal|TypeScript;showsyou can build|



|Tool|How we use it|Why it is current practice|
|---|---|---|
||actions), decide, validate, fall<br>back to the heuristic bot.|agents with guard rails, not just<br>chatbots.|
|Model provider SDK|Configured through<br>environment variables;<br>structured output checked by<br>Zod.|Keeps the provider swappable<br>and outputs verifiable.|



The AI never changes game state. It proposes an action, and the engine accepts or rejects it like any player's. 

### **Quality and testing** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|Vitest|Unit and integration tests for<br>engine, server and shared code.|Fast, TypeScript-native, Jest-<br>compatible API.|
|fast-check|Property tests: thousands of<br>random games checking<br>invariants (cash never negative,<br>supply never above 2,00,000).|Finds edge cases humans don't<br>think to write.|
|Playwright +<br>@axe-core/playwright|End-to-end multiplayer tests in<br>several browsers at once, plus<br>automated accessibility checks.|The leading E2E tool; axe is the<br>standard accessibility checker.|
|Artillery|Load tests of Socket.IO rooms<br>on local or staging.|Gives a real number for the<br>resume: concurrent rooms per<br>instance.|



### **Delivery and operations** 

|Tool|How we use it|Why it is current practice|
|---|---|---|
|Docker + Docker Compose|Postgres, Redis and all apps run<br>locally with one command; the<br>same images run in production.|"Works on my machine" is<br>solved by shipping the machine.|
|GitHub + GitHub Actions|Code hosting, pull requests and<br>the CI pipeline described later in<br>this doc.|The default for open-source and<br>most companies.|
|Vercel|Hosts the Next.js web app with<br>preview deployments per pull<br>request.|Built by the Next.js team; the<br>lowest-friction host for it.|



|Tool|How we use it|Why it is current practice|
|---|---|---|
|Railway, Render or Fly.io|Host the game server and AI<br>worker as containers with long-<br>lived WebSocket connections.|Serverless hosts can't hold<br>sockets open; these run normal<br>containers cheaply.|
|Managed Postgres and Redis|From the same host or a<br>dedicated provider, in a region<br>near India. Redis must use the<br>noevictionmemory policy for<br>BullMQ.|Backups, patching and TLS are<br>handled for you.|
|Cloudflare|DNS, TLS, DDoS protection, and<br>Turnstile (a privacy-friendly bot<br>check) on sign-up.|Free tier covers a project this<br>size; the common front door for<br>small sites.|
|Sentry|Error tracking for web and<br>server, with personal data<br>scrubbing on.|The industry-standard error<br>tracker.|



