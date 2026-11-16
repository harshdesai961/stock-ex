# Email setup (verification and password reset)

stock-ex sends three kinds of email, all from the web app over SMTP:

| Email | When | Link works for |
|---|---|---|
| Confirm your email | After sign-up, and again if someone logs in before confirming | 24 hours |
| Reset your password | After "Forgot your password?" | 1 hour, one use |
| Someone tried to sign up with your email | Sign-up with an address that already has an account | (links to /login) |

## Where the settings live

| What | File | Committed? |
|---|---|---|
| SMTP login (host, port, user, password, From) | the root `.env`, section "Email" | **No**, never |
| Variable names and safe defaults | `.env.example` | Yes |
| Validation of those values | `packages/shared/src/env/schema.ts` | Yes |
| Wording, subjects, link lifetimes, how the values become an SMTP connection | `apps/web/src/lib/email/config.ts` | Yes |
| The email designs (text and HTML) | `apps/web/src/lib/email/templates.ts` | Yes |

If your `.env` was made before these settings existed, run `pnpm bootstrap`. It appends the new `SMTP_*` and `EMAIL_FROM` keys (with a backup first) and never prints a value. Then open `.env` in your editor and fill them in.

## No SMTP yet? (local development)

Leave `SMTP_HOST` empty. Every email is then:

- printed in the terminal running `pnpm dev`, with the link, and
- saved as a text file in `.dev-mail/` at the repo root (git-ignored), handy when the dev server runs somewhere you can't see its output.

Production never falls back like this: with no `SMTP_HOST` it refuses to send and logs `email could not be sent`.

## The six variables

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-login
SMTP_PASSWORD=your-app-password-or-smtp-key
EMAIL_FROM="stock-ex <no-reply@your-domain.com>"
```

- **Port 587 + `SMTP_SECURE=false`**: connects, then upgrades to TLS (STARTTLS). We refuse to send if the upgrade doesn't happen, so the password never travels in the clear.
- **Port 465 + `SMTP_SECURE=true`**: TLS from the first byte.
- **`EMAIL_FROM`** must be an address or domain your provider lets you send from, or the mail is rejected or lands in spam.
- Restart `pnpm dev` after changing `.env`.

## Provider recipes (free tiers)

Free-tier limits change; check the provider's pricing page.

### Gmail (quickest for testing, about 500 emails a day)

1. Turn on 2-Step Verification for the Google account.
2. Create an **App password** at https://myaccount.google.com/apppasswords (name it "stock-ex"). Google shows 16 characters once.
3. Fill in:
   ```dotenv
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=you@gmail.com
   SMTP_PASSWORD=the-16-character-app-password
   EMAIL_FROM="stock-ex <you@gmail.com>"
   ```
   Never use your normal Gmail password. `EMAIL_FROM` must be the same Gmail address.

### Brevo (good free tier, about 300 emails a day)

1. Sign up at https://www.brevo.com, then open **SMTP & API → SMTP** and generate an SMTP key.
2. Add and verify your sender address (or your domain) under **Senders, domains & dedicated IPs**.
3. Fill in:
   ```dotenv
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=the-login-shown-on-the-SMTP-page
   SMTP_PASSWORD=the-SMTP-key
   EMAIL_FROM="stock-ex <no-reply@your-verified-domain.com>"
   ```

### Resend (best once you own a domain)

1. Sign up at https://resend.com, add your domain and create the DNS records it shows (SPF, DKIM).
2. Create an API key. Resend's SMTP server uses it as the password.
3. Fill in:
   ```dotenv
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=resend
   SMTP_PASSWORD=re_your_api_key
   EMAIL_FROM="stock-ex <no-reply@your-domain.com>"
   ```

### Mailtrap sandbox (staging: catches mail, delivers nothing)

Every email lands in a test inbox on mailtrap.io instead of a real mailbox, which is ideal for a shared staging server.

```dotenv
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=from-your-inbox-settings
SMTP_PASSWORD=from-your-inbox-settings
EMAIL_FROM="stock-ex <no-reply@stock-ex.test>"
```

## Before going live

- Send from your own domain, with SPF and DKIM set up as your provider explains. Without them, Gmail and Outlook will spam-folder you.
- Put the same six variables in the hosting platform's environment settings (Vercel → Project → Settings → Environment Variables). The `.env` file isn't deployed.
- Make sure `WEB_URL` is the public `https://` address. Every link in every email is built from it.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `email could not be sent: EAUTH` in the log | Wrong user or password; for Gmail, an app password is required |
| `ESOCKET` / `ETIMEDOUT` | Wrong host or port, or the network blocks outgoing SMTP (try 465 or 587) |
| `Greeting never received` / TLS errors | `SMTP_SECURE` doesn't match the port: 465 → `true`, 587 → `false` |
| Email arrives but lands in spam | `EMAIL_FROM` domain has no SPF/DKIM, or doesn't match the provider account |
| Link opens the wrong site | `WEB_URL` in `.env` is wrong |
| "Incorrect device time" in the sign-up robot check | Your computer's clock is off; turn on automatic time in Windows Settings → Time & language |
