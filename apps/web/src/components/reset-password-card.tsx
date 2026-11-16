'use client';

import { fieldErrors, PASSWORD_MAX, PASSWORD_MIN, resetPasswordSchema } from '@stock-ex/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState, type SyntheticEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Field } from './form-field';
import { PasswordInput } from './password-input';

type Errors = Partial<Record<string, string>>;

/** The form behind the emailed reset link. The one-time token comes from the link's URL. */
export function ResetPasswordCard({ token }: { token: string | undefined }) {
  const id = useId();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="panel p-6">
        <h2 className="text-2xl font-bold uppercase">That link didn’t work</h2>
        <p className="mt-2 text-ink-300">
          Reset links work once and for one hour. Ask for a new one from the login page.
        </p>
        <Link href="/login" className="btn-game btn-primary mt-5 px-4 py-2">
          Back to log in
        </Link>
      </div>
    );
  }

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy) return;
    setStatus('');
    const result = resetPasswordSchema.safeParse({ password, confirm });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: result.data.password,
        token,
      });
      if (error) {
        setStatus(
          error.status === 400
            ? 'That link has expired or was already used. Ask for a new one from the login page.'
            : 'Something went wrong on our side. Please try again.',
        );
        return;
      }
      router.push('/login?notice=reset_done');
    } catch {
      setStatus('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-6">
      <h2 className="text-2xl font-bold uppercase">Choose a new password</h2>
      <p className="mt-1 text-sm text-ink-300">
        This signs you out everywhere else, so only the new password works.
      </p>
      <form noValidate onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
        <Field
          id={`${id}-password`}
          label="New password"
          error={errors.password}
          hint={`${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`}
        >
          <PasswordInput
            id={`${id}-password`}
            value={password}
            onChange={setPassword}
            error={errors.password}
            describedBy={errors.password ? `${id}-password-error` : `${id}-password-hint`}
            autoComplete="new-password"
          />
        </Field>
        <Field id={`${id}-confirm`} label="Type it again" error={errors.confirm}>
          <PasswordInput
            id={`${id}-confirm`}
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
            describedBy={errors.confirm ? `${id}-confirm-error` : undefined}
            autoComplete="new-password"
          />
        </Field>
        <button
          type="submit"
          aria-disabled={busy}
          className="btn-game btn-primary w-full py-3 text-lg"
        >
          {busy ? 'One moment…' : 'Save new password'}
        </button>
      </form>
      <p role="status" className="mt-4 min-h-6 text-sm text-accent-400">
        {status}
      </p>
    </div>
  );
}
