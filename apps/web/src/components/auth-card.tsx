'use client';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import {
  DISPLAY_NAME_MAX,
  fieldErrors,
  forgotPasswordSchema,
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordStrength,
  signInSchema,
  signUpSchema,
} from '@stock-ex/shared';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type SyntheticEvent } from 'react';
import { siApple, siDiscord, siFacebook, siX, type SimpleIcon } from 'simple-icons';
import { authClient } from '@/lib/auth-client';
import { BrandBadge, GoogleBadge } from './brand-badges';
import { Field, inputClass } from './form-field';
import { PasswordInput } from './password-input';

/** Providers the server can switch on (matches SOCIAL_PROVIDERS in lib/auth.ts). */
export type SocialProviderId = 'google' | 'discord' | 'facebook' | 'twitter';

// Brand marks are shown only to identify the sign-in option, as each brand's guidelines allow.
// Apple needs a paid Apple developer account, so it stays switched off for now.
const SOCIAL: readonly { id: SocialProviderId | 'apple'; name: string; icon: SimpleIcon }[] = [
  { id: 'discord', name: 'Discord', icon: siDiscord },
  { id: 'facebook', name: 'Facebook', icon: siFacebook },
  { id: 'twitter', name: 'X', icon: siX },
  { id: 'apple', name: 'Apple', icon: siApple },
];

type Mode = 'signin' | 'signup' | 'forgot' | 'inbox';
type Errors = Partial<Record<string, string>>;
interface AuthError {
  status: number;
  code?: string | undefined;
  message?: string | undefined;
}

const STRENGTH = ['', 'Weak', 'Okay', 'Good', 'Strong'] as const;
const AFTER_LOGIN = '/account';

/** Plain-language text for Better Auth's error responses. */
function friendlyError(error: AuthError) {
  if (error.status === 429) return 'Too many tries. Wait a minute, then try again.';
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD') return 'That email and password don’t match.';
  if (error.message?.toLowerCase().includes('captcha')) {
    return 'The robot check didn’t pass. Please try it again.';
  }
  // Our own validation messages (lib/auth.ts hooks) are written for people, so show them.
  if (error.status === 400 && error.message) return error.message;
  return 'Something went wrong on our side. Please try again.';
}

export function AuthCard({
  socialEnabled,
  turnstileSiteKey,
  notice,
}: {
  socialEnabled: readonly SocialProviderId[];
  turnstileSiteKey: string;
  /** A message from the URL, e.g. after an expired verification link. */
  notice?: string | undefined;
}) {
  const ids = useId();
  const router = useRouter();
  const turnstile = useRef<TurnstileInstance | null>(null);
  const [mode, setMode] = useState<Mode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState(notice ?? '');
  const [busy, setBusy] = useState(false);

  const id = (name: string) => `${ids}-${name}`;
  const describedBy = (name: string, error: string | undefined, hint = false) =>
    error ? `${id(name)}-error` : hint ? `${id(name)}-hint` : undefined;
  const needsCaptcha = mode === 'signup' || mode === 'forgot';

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setStatus('');
    setCaptchaToken('');
  };

  /** A Turnstile token works once; get a fresh one after every attempt. */
  const resetCaptcha = () => {
    setCaptchaToken('');
    turnstile.current?.reset();
  };

  const captchaHeaders = () => ({ headers: { 'x-captcha-response': captchaToken } });

  const signUp = async () => {
    const result = signUpSchema.safeParse({ displayName, email, password, ageConfirmed });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    // ageConfirmed isn't a Better Auth field; our server hook checks it (lib/auth.ts).
    const body = {
      name: result.data.displayName,
      email: result.data.email,
      password: result.data.password,
      ageConfirmed: true,
      callbackURL: AFTER_LOGIN,
    };
    const { error } = await authClient.signUp.email(body, captchaHeaders());
    resetCaptcha();
    if (error) {
      setStatus(friendlyError(error));
      return;
    }
    setPassword('');
    setMode('inbox');
  };

  const signIn = async () => {
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    const { error } = await authClient.signIn.email({
      email: result.data.email,
      password: result.data.password,
      rememberMe: true,
      callbackURL: AFTER_LOGIN,
    });
    if (error) {
      // 403 = the password was right but the email isn't confirmed; a fresh link is on its way.
      if (error.status === 403) {
        setPassword('');
        setMode('inbox');
        setStatus('Confirm your email first. We’ve sent you a fresh link.');
        return;
      }
      setStatus(friendlyError(error));
      return;
    }
    router.push(AFTER_LOGIN);
    router.refresh();
  };

  const forgot = async () => {
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    const { error } = await authClient.requestPasswordReset(
      { email: result.data.email, redirectTo: '/reset-password' },
      captchaHeaders(),
    );
    resetCaptcha();
    // Same answer whether or not the account exists, so the form can't be used to probe emails.
    setStatus(
      error
        ? friendlyError(error)
        : 'If that email has an account, a reset link is on its way. Check your inbox.',
    );
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy) return;
    setErrors({});
    setStatus('');
    if (needsCaptcha && !captchaToken) {
      setStatus('Please finish the quick robot check below first.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') await signUp();
      else if (mode === 'signin') await signIn();
      else await forgot();
    } catch {
      setStatus('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL: AFTER_LOGIN });
      setStatus(error ? friendlyError(error) : 'Sent. The newest link is the one that works.');
    } catch {
      setStatus('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: SocialProviderId | 'apple', name: string) => {
    if (busy) return;
    if (provider === 'apple' || !socialEnabled.includes(provider)) {
      setStatus(`Signing in with ${name} isn’t switched on yet. Use email, or play as a guest.`);
      return;
    }
    if (mode === 'signup' && !ageConfirmed) {
      setErrors({ ageConfirmed: 'Tick the 18+ box first. Accounts are for adults only.' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: AFTER_LOGIN,
        errorCallbackURL: '/login',
      });
      // On success the browser is already on its way to the provider's page.
      if (error) {
        setBusy(false);
        setStatus(friendlyError(error));
      }
    } catch {
      setBusy(false);
      setStatus('We couldn’t reach the server. Check your connection and try again.');
    }
  };

  const strength = passwordStrength(password);
  const tab = (value: 'signin' | 'signup', label: string) => (
    <button
      type="button"
      role="tab"
      id={id(`tab-${value}`)}
      aria-selected={mode === value}
      aria-controls={id('panel')}
      onClick={() => {
        switchMode(value);
      }}
      className={`font-display flex-1 cursor-pointer rounded-md py-2 text-sm font-bold tracking-wider uppercase ${
        mode === value ? 'bg-bull-500 text-ink-950' : 'text-ink-300 hover:text-ink-100'
      }`}
    >
      {label}
    </button>
  );

  const statusLine = (
    <p role="status" className="mt-4 min-h-6 text-sm text-accent-400">
      {status}
    </p>
  );

  if (mode === 'inbox') {
    return (
      <div className="panel p-6">
        <span
          aria-hidden="true"
          className="pop-in flex h-14 w-14 items-center justify-center rounded-xl border-2 border-ink-100 bg-tile-yellow text-ink-950"
        >
          <MailCheck className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <h2 className="mt-4 text-2xl font-bold uppercase">Check your inbox</h2>
        <p className="mt-2 text-ink-100">
          We sent a link to <strong className="break-all">{email}</strong>. Open it to confirm your
          email and you’ll be signed in. The link works for 24 hours.
        </p>
        <p className="mt-2 text-sm text-ink-300">
          Nothing there? Check spam, or send a new link. If the address already has an account, we
          email that account a note instead.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void resend()}
            aria-disabled={busy}
            className="btn-game btn-primary px-4 py-2"
          >
            Send a new link
          </button>
          <button
            type="button"
            onClick={() => {
              switchMode('signin');
            }}
            className="btn-game btn-ghost px-4 py-2"
          >
            Back to log in
          </button>
        </div>
        {statusLine}
      </div>
    );
  }

  const heading =
    mode === 'signin'
      ? 'Welcome back, trader'
      : mode === 'signup'
        ? 'Join the trading floor'
        : 'Forgot your password?';
  const intro =
    mode === 'signin'
      ? 'Log in to keep your stats, match history and avatar.'
      : mode === 'signup'
        ? 'Free, 18+ only, and play money only. We never ask for your birth date or phone.'
        : 'Enter your account email and we’ll send you a link to choose a new password.';
  const submitLabel =
    mode === 'signin' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link';

  return (
    <div className="panel p-6">
      {mode === 'forgot' ? null : (
        <div
          role="tablist"
          aria-label="Log in or create an account"
          className="flex gap-1 rounded-lg border border-bull-500/30 bg-ink-950 p-1"
        >
          {tab('signin', 'Log in')}
          {tab('signup', 'Create account')}
        </div>
      )}

      <div
        {...(mode === 'forgot'
          ? {}
          : { role: 'tabpanel', id: id('panel'), 'aria-labelledby': id(`tab-${mode}`) })}
        className="mt-5"
      >
        <h2 className="text-2xl font-bold uppercase">{heading}</h2>
        <p className="mt-1 text-sm text-ink-300">{intro}</p>

        {mode === 'forgot' ? null : (
          <>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => void social('google', 'Google')}
                aria-disabled={busy}
                className="social-btn lift w-full justify-start gap-3 px-3 py-2"
              >
                <GoogleBadge />
                <span className="flex-1 text-center">Continue with Google</span>
                <span aria-hidden="true" className="w-9" />
              </button>
              <div className="grid grid-cols-4 gap-2">
                {SOCIAL.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    aria-label={`Continue with ${provider.name}`}
                    title={provider.name}
                    aria-disabled={busy}
                    onClick={() => void social(provider.id, provider.name)}
                    className="social-btn lift flex-col gap-1 px-1 py-2"
                  >
                    <BrandBadge icon={provider.icon} />
                    <span aria-hidden="true" className="text-[11px] tracking-normal">
                      {provider.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <p className="my-4 flex items-center gap-3 text-xs text-ink-300 uppercase">
              <span className="h-px flex-1 bg-ink-700" />
              or with email
              <span className="h-px flex-1 bg-ink-700" />
            </p>
          </>
        )}

        <form noValidate onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
          {mode === 'signup' ? (
            <Field
              id={id('displayName')}
              label="Display name"
              error={errors.displayName}
              hint="Shown to other players. You can change it later."
            >
              <input
                id={id('displayName')}
                value={displayName}
                maxLength={DISPLAY_NAME_MAX}
                autoComplete="nickname"
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={describedBy('displayName', errors.displayName, true)}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                }}
                className={inputClass(errors.displayName)}
              />
            </Field>
          ) : null}

          <Field id={id('email')} label="Email" error={errors.email}>
            <input
              id={id('email')}
              type="email"
              inputMode="email"
              value={email}
              autoComplete="email"
              placeholder="name@example.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy('email', errors.email)}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              className={inputClass(errors.email)}
            />
          </Field>

          {mode === 'forgot' ? null : (
            <Field
              id={id('password')}
              label="Password"
              error={errors.password}
              {...(mode === 'signup'
                ? { hint: `${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` }
                : {})}
            >
              <PasswordInput
                id={id('password')}
                value={password}
                onChange={setPassword}
                error={errors.password}
                describedBy={describedBy('password', errors.password, mode === 'signup')}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && password ? (
                <div className="mt-2 flex items-center gap-3">
                  <meter
                    className="strength"
                    min={0}
                    max={4}
                    low={2}
                    high={3}
                    optimum={4}
                    value={strength}
                    aria-label="Password strength"
                  />
                  <span className="w-14 text-xs text-ink-300">{STRENGTH.at(strength)}</span>
                </div>
              ) : null}
            </Field>
          )}

          {mode === 'signup' ? (
            <div>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  aria-invalid={Boolean(errors.ageConfirmed)}
                  aria-describedby={errors.ageConfirmed ? id('age-error') : undefined}
                  onChange={(event) => {
                    setAgeConfirmed(event.target.checked);
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-bull-500"
                />
                <span>I confirm I am 18 or older.</span>
              </label>
              {errors.ageConfirmed ? (
                <p id={id('age-error')} className="mt-1 text-sm text-bear-400">
                  {errors.ageConfirmed}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-ink-300">
                We store your email, display name, avatar choice, game history and when you
                confirmed your age. Nothing else.
              </p>
            </div>
          ) : null}

          {needsCaptcha ? (
            <Turnstile
              ref={turnstile}
              siteKey={turnstileSiteKey}
              onSuccess={setCaptchaToken}
              onExpire={() => {
                setCaptchaToken('');
              }}
              onError={() => {
                setCaptchaToken('');
              }}
              options={{ theme: 'dark', size: 'flexible', action: mode }}
            />
          ) : null}

          <button
            type="submit"
            aria-disabled={busy}
            className="btn-game btn-primary w-full py-3 text-lg"
          >
            {busy ? 'One moment…' : submitLabel}
          </button>
        </form>

        {mode === 'signin' ? (
          <button
            type="button"
            onClick={() => {
              switchMode('forgot');
            }}
            className="mt-3 cursor-pointer text-sm text-ink-300 underline hover:text-accent-400"
          >
            Forgot your password?
          </button>
        ) : null}
        {mode === 'forgot' ? (
          <button
            type="button"
            onClick={() => {
              switchMode('signin');
            }}
            className="mt-3 cursor-pointer text-sm text-ink-300 underline hover:text-accent-400"
          >
            Back to log in
          </button>
        ) : null}

        {statusLine}

        <div className="mt-2 border-t border-ink-700 pt-4 text-center text-sm text-ink-300">
          Just want to play?{' '}
          <Link href="/" className="font-semibold text-bull-400 underline hover:text-accent-400">
            Play as a guest
          </Link>
        </div>
      </div>
    </div>
  );
}
