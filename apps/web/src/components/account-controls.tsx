'use client';

import { DISPLAY_NAME_MAX, displayNameSchema } from '@stock-ex/shared';
import { LogOut, MonitorSmartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type SyntheticEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Field, inputClass } from './form-field';

const OFFLINE = 'We couldn’t reach the server. Check your connection and try again.';

/** Change the display name other players see. The server checks the same rules. */
export function DisplayNameForm({ current }: { current: string }) {
  const id = useId();
  const router = useRouter();
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (event: SyntheticEvent) => {
    event.preventDefault();
    if (busy) return;
    setStatus('');
    const result = displayNameSchema.safeParse(name);
    if (!result.success) {
      setError(result.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    if (result.data === current) {
      setStatus('That’s already your name.');
      return;
    }
    setBusy(true);
    try {
      const { error: apiError } = await authClient.updateUser({ name: result.data });
      if (apiError) {
        if (apiError.status === 400 && apiError.message) setError(apiError.message);
        else setStatus('Couldn’t save just now. Please try again.');
        return;
      }
      setStatus('Saved.');
      router.refresh();
    } catch {
      setStatus(OFFLINE);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate onSubmit={(event) => void save(event)} className="space-y-3">
      <Field
        id={`${id}-name`}
        label="Display name"
        error={error}
        hint="Letters, numbers, spaces, dots, dashes or underscores."
      >
        <input
          id={`${id}-name`}
          value={name}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-name-error` : `${id}-name-hint`}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className={inputClass(error)}
        />
      </Field>
      <div className="flex items-center gap-3">
        <button type="submit" aria-disabled={busy} className="btn-game btn-primary px-4 py-2">
          {busy ? 'Saving…' : 'Save name'}
        </button>
        <p role="status" className="text-sm text-accent-400">
          {status}
        </p>
      </div>
    </form>
  );
}

/** Sign out here, or end every session on every device (e.g. after using a shared computer). */
export function SignOutButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const run = async (everywhere: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (everywhere) await authClient.revokeSessions();
      await authClient.signOut();
      router.push('/login?notice=signed_out');
      router.refresh();
    } catch {
      setBusy(false);
      setStatus(OFFLINE);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-disabled={busy}
          onClick={() => void run(false)}
          className="btn-game btn-ghost px-4 py-2"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
        <button
          type="button"
          aria-disabled={busy}
          onClick={() => void run(true)}
          className="btn-game btn-dark px-4 py-2"
        >
          <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />
          Sign out on every device
        </button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-accent-400">
        {status}
      </p>
    </div>
  );
}
