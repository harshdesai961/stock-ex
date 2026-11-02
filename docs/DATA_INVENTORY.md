# Data inventory

Every piece of personal data we hold: purpose, where it lives, who processes it, and how long we keep it.
Required by the DPDP Act 2023 / DPDP Rules 2025 and good GDPR practice. **Update this file in the same PR that adds a field.**

**Version:** M0 (2026-10-26). No personal data is stored yet.

## Guests (from M2)

| Data | Purpose | Where | Retention |
|---|---|---|---|
| Nickname (≤ 10 chars) | Shown to players at the table | Redis room snapshot only | Room TTL (6 hours after last activity); finished guest games are anonymised |
| Signed guest token | Reconnect to your seat | Browser cookie (httpOnly) + verified by server | Session |

Guests provide no email, phone, birth date, location or contacts.

## Accounts (from M4, 18+ only)

| Data | Purpose | Where | Processor | Retention |
|---|---|---|---|---|
| Email | Sign-in, verification, password reset, breach notices | Postgres | Hosting DB provider; email provider (Resend) | Until account deletion; inactive 3 years → deleted after notice |
| Password hash | Sign-in | Postgres (Better Auth) | Hosting DB provider | Until deletion |
| Google account ID | Google sign-in | Postgres | Google (identity provider) | Until deletion |
| Display name, avatar choice | Shown in games and leaderboards | Postgres | Hosting DB provider | Until deletion (game history anonymised) |
| Age confirmation timestamp | Proof of 18+ confirmation | Postgres | Hosting DB provider | Until deletion |
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
| Resend (or similar) | Sends verification and reset emails | M4 |
| Sentry | Error tracking | M2 |
| Cloudflare | DNS, TLS, Turnstile | M4/M7 |

## Not collected, by design

Phone numbers, dates of birth, location, contacts, payment details, advertising IDs, analytics cookies.
