'use client';

import { PASSWORD_MAX } from '@stock-ex/shared';
import { useState } from 'react';
import { inputClass } from './form-field';

/** A password box with a Show / Hide toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  error,
  describedBy,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  describedBy: string | undefined;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        value={value}
        maxLength={PASSWORD_MAX}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className={`${inputClass(error)} pr-16`}
      />
      <button
        type="button"
        aria-pressed={shown}
        aria-label={shown ? 'Hide password' : 'Show password'}
        onClick={() => {
          setShown((current) => !current);
        }}
        className="font-display absolute top-1/2 right-2 mt-0.5 -translate-y-1/2 cursor-pointer px-2 py-1 text-xs text-bull-400 uppercase"
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
