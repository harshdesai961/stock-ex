import type { ReactNode } from 'react';

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error: string | undefined;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-display block text-sm tracking-wider uppercase">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-300">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-bear-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const INPUT =
  'mt-1 w-full rounded-md border bg-ink-950 px-3 py-2.5 placeholder:text-ink-300 focus:border-bull-400';
export const inputClass = (error: string | undefined) =>
  `${INPUT} ${error ? 'border-bear-500' : 'border-bull-500/40'}`;
