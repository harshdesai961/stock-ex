# Data inventory

Every piece of personal data we hold: purpose, where it lives, who processes it, and how long we keep it.
Required by the DPDP Act 2023 / DPDP Rules 2025 and good GDPR practice. **Update this file in the same PR that adds a field.**

**Version:** M0 (2026-10-26). No personal data is stored yet.

## Guests (from M2)

| Data | Purpose | Where | Retention |
|---|---|---|---|
| Nickname (≤ 10 chars) | Shown to players at the table | Inside the 5-minute socket token; Redis room snapshot | Token: 5 minutes. Room: TTL (6 hours after last activity); finished guest games are anonymised |
| Random guest id (`g_` + 128 random bits) | Reconnect to your seat after a refresh | Browser cookie `stock-ex.guest` (`__Host-stock-ex.guest` in production), httpOnly, strictly necessary; inside the socket token | 24 hours, renewed when you play |
| Socket token (signed; carries the guest id or account id and the display name) | Prove who you are to the game server | Browser memory only, never stored | 5 minutes |

Guests provide no email, phone, birth date, location or contacts.

## Accounts (from M4, 18+ only)

| Data | Purpose | Where | Processor | Retention |
|---|---|---|---|---|
| Email | Sign-in, verification, password reset, breach notices | Postgres `users.email` | Hosting DB provider; the SMTP provider in `SMTP_HOST` | Until account deletion; inactive 3 years → deleted after notice |
| Password hash (scrypt) | Sign-in | Postgres `accounts.password` (Better Auth) | Hosting DB provider | Until deletion |
| Social account ID and OAuth tokens (Google; Discord, Facebook, X when switched on) | Social sign-in. Tokens are encrypted at rest and not used for anything else; the provider's name is tidied to our display-name rules and its profile-photo URL is discarded | Postgres `accounts` | That provider (identity provider) | Until deletion |
| Sessions: IP address, browser user agent, expiry | Keep you signed in; "sign out on every device"; abuse investigation | Postgres `sessions` | Hosting DB provider | Until the session expires or is revoked (7 days, refreshed daily) |
| Verification and reset tokens | Confirm email ownership; reset a password | Postgres `verifications` (reset) or signed into the link (verification) | Hosting DB provider; the SMTP provider carries the link | 24 hours (verification), 1 hour (reset); one use |
| Rate-limit counters (key = IP + route) | Slow down password guessing and email spam | Postgres `rate_limits` | Hosting DB provider | Overwritten each window |
| Last active time | Inactive-account deletion after 3 years (spec 12.3) | Postgres `profiles.last_active_at` | Hosting DB provider | Until deletion |
| Display name, avatar choice | Shown in games and leaderboards | Postgres | Hosting DB provider | Until deletion (game history anonymised) |
| Age confirmation timestamp | Proof of 18+ confirmation | Postgres `profiles.age_confirmed_at` | Hosting DB provider | Until deletion |
| Game history, stats | Match history, leaderboards, replays | Postgres | Hosting DB provider | Until deletion; then anonymised |

## Operational data

| Data | Purpose | Where | Retention |
|---|---|---|---|
| Security logs (IP, user ID, event type; no passwords, tokens or emails, redacted by pino) | Detect and investigate abuse | Hosting log platform | At least 1 year (DPDP Rules), then deleted |
| Error reports | Fix crashes | Sentry (PII scrubbing on) | Sentry default retention |

## Processors (vendors touching personal data)

| Vendor | Role | Status |
|---|---|---|
| Hosting provider (web: Vercel; server/worker: Railway, Render or Fly.io) | Runs the apps, holds logs | Chosen at M3/M7 |
| Managed Postgres / Redis provider | Stores data | Chosen at M3/M7 |
| SMTP email provider (whichever `SMTP_HOST` points at; see docs/EMAIL.md) | Sends verification and reset emails | M4 (chosen per deployment) |
| Sentry | Error tracking | M2 |
| Cloudflare | DNS, TLS, Turnstile | M4/M7 |

## Not collected, by design

Phone numbers, dates of birth, location, contacts, payment details, advertising IDs, analytics cookies.
