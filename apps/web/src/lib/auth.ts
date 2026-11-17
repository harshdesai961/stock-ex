import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { createProfile, schema, touchProfile } from '@stock-ex/db';
import { cleanDisplayName, displayNameSchema, signUpRequestSchema } from '@stock-ex/shared';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { captcha } from 'better-auth/plugins';
import { after } from 'next/server';
import { getDb } from './db';
import { EMAIL_SETTINGS } from './email/config';
import { sendEmail } from './email/mailer';
import {
  existingAccountEmail,
  resetPasswordEmail,
  verificationEmail,
  type EmailMessage,
} from './email/templates';
import { serverEnv } from './env';

/** Social sign-in providers this app knows about, in the order the buttons appear. */
export const SOCIAL_PROVIDERS = ['google', 'discord', 'facebook', 'twitter'] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

function socialConfig() {
  const env = serverEnv();
  const pair = (id: string | undefined, secret: string | undefined) =>
    id && secret ? { clientId: id, clientSecret: secret } : undefined;
  const google = pair(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  const discord = pair(env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET);
  const facebook = pair(env.FACEBOOK_CLIENT_ID, env.FACEBOOK_CLIENT_SECRET);
  const twitter = pair(env.TWITTER_CLIENT_ID, env.TWITTER_CLIENT_SECRET);
  return {
    ...(google ? { google: { ...google, prompt: 'select_account' as const } } : {}),
    ...(discord ? { discord } : {}),
    ...(facebook ? { facebook } : {}),
    ...(twitter ? { twitter } : {}),
  };
}

/** Providers whose keys are set, so the login page can enable just those buttons. */
export function enabledSocialProviders(): SocialProvider[] {
  const configured = socialConfig();
  return SOCIAL_PROVIDERS.filter((provider) => provider in configured);
}

/**
 * Sends an auth email. Better Auth hands the returned promise to `advanced.backgroundTasks`
 * (Next's after()), so the response doesn't wait on SMTP and can't be timed to probe accounts.
 */
function sendAuthEmail(message: EmailMessage): Promise<void> {
  return sendEmail(message).catch((error: unknown) => {
    // Never log the address, the link or the server's reply: they identify the person or carry a token.
    const code = (error as { code?: unknown }).code;
    console.error(
      '[auth] email could not be sent:',
      typeof code === 'string' ? code : 'unknown error',
    );
  });
}

function zodMessage(error: { issues: readonly { message: string }[] }) {
  return error.issues[0]?.message ?? 'Check the form and try again.';
}

function createAuth() {
  const env = serverEnv();
  const db = getDb();
  const isProduction = env.NODE_ENV === 'production';

  return betterAuth({
    appName: 'stock-ex',
    baseURL: env.WEB_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
    telemetry: { enabled: false },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // No session until the email is confirmed; signing in unverified re-sends the link.
      requireEmailVerification: true,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: EMAIL_SETTINGS.resetLinkSeconds,
      revokeSessionsOnPasswordReset: true,
      // Signing up with a taken address looks the same as a new sign-up (no account probing);
      // the real owner gets a heads-up instead.
      onExistingUserSignUp: ({ user }) =>
        sendAuthEmail(existingAccountEmail(user.email, user.name, `${env.WEB_URL}/login`)),
      sendResetPassword: ({ user, url }) =>
        sendAuthEmail(resetPasswordEmail(user.email, user.name, url)),
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: EMAIL_SETTINGS.verificationLinkSeconds,
      sendVerificationEmail: ({ user, url }) =>
        sendAuthEmail(verificationEmail(user.email, user.name, url)),
    },

    socialProviders: socialConfig(),

    account: {
      // We only need to know who the person is, but Better Auth still stores the tokens the
      // provider hands back; keep them encrypted at rest (spec 12.3, minimisation).
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        // A social login joins an existing email account only when both sides have proved the
        // address: the provider says it's verified AND the local account confirmed its email.
        // This blocks pre-registering someone's address with a password and waiting for them.
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
        // Never copy the provider's name or photo over what the player chose here.
        updateUserInfoOnLink: false,
      },
    },

    rateLimit: {
      enabled: true,
      // Kept in Postgres so every web instance shares the same counters.
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 600, max: 5 },
        '/request-password-reset': { window: 900, max: 3 },
        '/send-verification-email': { window: 300, max: 3 },
        // Each call creates an OAuth state row; real people click this a few times at most.
        '/sign-in/social': { window: 60, max: 10 },
      },
    },

    advanced: {
      useSecureCookies: isProduction,
      cookiePrefix: 'stock-ex',
      // Emails go out after the response is sent (Next's after() keeps the work alive on Vercel).
      backgroundTasks: {
        handler: (promise) => {
          after(promise);
        },
      },
    },

    hooks: {
      // The 18+ rule and display-name rules are checked here, on the server, whatever the form did.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email') {
          const result = signUpRequestSchema.safeParse(ctx.body);
          if (!result.success)
            throw new APIError('BAD_REQUEST', { message: zodMessage(result.error) });
        }
        const body = ctx.body as Record<string, unknown> | undefined;
        if (ctx.path === '/update-user' && body && 'name' in body) {
          const result = displayNameSchema.safeParse(body.name);
          if (!result.success)
            throw new APIError('BAD_REQUEST', { message: zodMessage(result.error) });
        }
        return Promise.resolve();
      }),
    },

    databaseHooks: {
      user: {
        create: {
          // Names from Google, Discord and so on may not fit our rules; tidy them up. Their
          // profile photo URL is dropped: avatars come only from our fixed set (spec 8) and we
          // don't keep personal data we don't use (spec 12.3).
          before: (user, ctx) =>
            Promise.resolve(
              ctx?.path === '/sign-up/email'
                ? { data: user }
                : { data: { ...user, name: cleanDisplayName(user.name), image: null } },
            ),
          // Every account gets a profile. Only the email form records the 18+ tick right away;
          // social accounts confirm on their account page.
          after: async (user, ctx) => {
            await createProfile(db, user.id, ctx?.path === '/sign-up/email' ? new Date() : null);
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await touchProfile(db, session.userId);
          },
        },
      },
    },

    plugins: [
      // Turnstile on sign-up (spec 8) and on reset requests, which also send email.
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: env.TURNSTILE_SECRET_KEY,
        endpoints: ['/sign-up/email', '/request-password-reset'],
      }),
      nextCookies(), // must stay last
    ],
  });
}

// Module-level (not globalThis) so a code edit in development rebuilds it with the new config;
// the database pool underneath is the part that is shared across reloads (lib/db.ts).
let instance: ReturnType<typeof createAuth> | undefined;

/** The Better Auth server instance, created on first use. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
