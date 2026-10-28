# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

- Preferred: GitHub **private vulnerability reporting** on this repository
  (Security tab → "Report a vulnerability").
- Email: `TODO: security contact address` (to be filled in before the repository is public).

Include what you found, how to reproduce it, and what an attacker could do with it.
We aim to acknowledge reports within 3 days and to fix confirmed high-severity issues
within 14 days. We will credit you in the fix unless you prefer otherwise.

## Scope

In scope: the web app, the game server, the AI worker and this repository's code and CI.
Out of scope: denial-of-service volume tests, social engineering, and third-party services
(hosting, email, Sentry) except where our configuration of them is at fault.

stock-ex uses play money only; there are no payments or real-money balances to target.

## How we handle a breach

See [docs/INCIDENT_RUNBOOK.md](docs/INCIDENT_RUNBOOK.md) (notification to the Data Protection
Board of India without delay, a detailed report within 72 hours, and notice to affected users).
