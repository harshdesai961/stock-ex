# Incident runbook

What to do if personal data or a secret may have leaked. Written now so nobody has to think under pressure.
This is engineering guidance, not legal advice; have it reviewed before commercial launch.

## 0. Roles

Both developers are on the incident. The first to notice is the **lead** until they hand it over. Keep a timestamped log (who did what, when) in a private document from minute one.

## 1. Contain (first hour)

- [ ] **Leaked secret?** Rotate it immediately in the hosting platform / GitHub secrets, then redeploy. Deleting it from Git history is **not** enough.
  - Database/Redis password → rotate, update `DATABASE_URL`/`REDIS_URL` everywhere.
  - `BETTER_AUTH_SECRET` → rotate; all sessions end (users sign in again).
  - `SOCKET_TOKEN_SECRET` → rotate; sockets reconnect with new tokens.
- [ ] Revoke compromised sessions and API keys; disable affected accounts if needed.
- [ ] If an attacker is active: put the app in maintenance mode or scale the server to zero.
- [ ] Preserve evidence: export relevant logs before retention deletes them.

## 2. Assess (within 24 hours)

- What data, how many users, which time window, how it happened, is it still happening?
- Is it a **personal data breach** (any unauthorised access, disclosure, alteration or loss of personal data)? If unsure, treat it as one.

## 3. Notify

Under the DPDP Rules 2025 (obligations in force from 13 May 2027; we follow them now):

- [ ] **Data Protection Board of India: without delay**, an initial intimation describing the breach, its nature, extent, timing and likely impact.
- [ ] **Within 72 hours** (or longer if the Board allows): a detailed report covering facts and circumstances, cause, mitigation, the person responsible if known, remedial steps, and reports sent to affected users.
- [ ] **Affected users without delay**, by email to their registered address, in plain language: what happened, what data, likely consequences, what we did, what they should do (e.g. change password), and a contact.
- [ ] GDPR (EU/UK users): the supervisory authority within 72 hours where required.

Templates live alongside this file once accounts exist (M4).

## 4. Recover and learn

- [ ] Fix the root cause; add a regression test or CI check.
- [ ] Update `docs/THREAT_MODEL.md` and this runbook.
- [ ] Write a blameless post-incident note in `docs/` within 2 weeks.

## Contacts

| Who | How |
|---|---|
| Developers | TODO: fill in before staging (M3) |
| Hosting / DB provider support | TODO: fill in at M7 |
| Data Protection Board of India | Per the Board's published procedure at the time |
