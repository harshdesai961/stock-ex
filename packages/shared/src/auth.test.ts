import { describe, expect, it } from 'vitest';
import {
  cleanDisplayName,
  fieldErrors,
  passwordStrength,
  resetPasswordSchema,
  signInSchema,
  signUpRequestSchema,
  signUpSchema,
} from './auth.js';

const valid = {
  displayName: 'Dalal Don',
  email: '  Player@Example.com ',
  password: 'correct horse',
  ageConfirmed: true as const,
};

describe('signUpSchema', () => {
  it('accepts a valid sign-up and trims the email', () => {
    const result = signUpSchema.parse(valid);
    expect(result.email).toBe('Player@Example.com');
  });

  it('requires the 18+ confirmation', () => {
    const result = signUpSchema.safeParse({ ...valid, ageConfirmed: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).ageConfirmed).toMatch(/18 or older/);
  });

  it('enforces password length 8 to 128', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: 'x'.repeat(129) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: 'x'.repeat(8) }).success).toBe(true);
  });

  it('rejects bad emails and display names', () => {
    const bad = signUpSchema.safeParse({ ...valid, email: 'nope', displayName: '<b>' });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const errors = fieldErrors(bad.error);
      expect(errors.email).toMatch(/valid email/);
      expect(errors.displayName).toMatch(/letters, numbers/);
    }
  });
});

describe('signInSchema', () => {
  it('needs both fields', () => {
    const result = signInSchema.safeParse({ email: '', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(['email', 'password']);
    }
  });
});

describe('passwordStrength', () => {
  it('scores length and variety', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(1);
    expect(passwordStrength('abcdefgh')).toBe(1);
    expect(passwordStrength('abcdefghijkl')).toBe(2);
    expect(passwordStrength('Abcdefghijk1!')).toBe(4);
  });
});

describe('signUpRequestSchema', () => {
  const body = { name: 'Dalal Don', email: 'a@b.co', password: 'x'.repeat(8), ageConfirmed: true };

  it('requires the 18+ flag on the server too', () => {
    expect(signUpRequestSchema.safeParse(body).success).toBe(true);
    expect(signUpRequestSchema.safeParse({ ...body, ageConfirmed: false }).success).toBe(false);
    const missing: Partial<typeof body> = { ...body };
    delete missing.ageConfirmed;
    expect(signUpRequestSchema.safeParse(missing).success).toBe(false);
  });

  it('lets the auth library’s own keys through', () => {
    const parsed = signUpRequestSchema.parse({ ...body, callbackURL: '/account' });
    expect(parsed.callbackURL).toBe('/account');
  });
});

describe('resetPasswordSchema', () => {
  it('needs matching passwords', () => {
    const result = resetPasswordSchema.safeParse({ password: 'x'.repeat(8), confirm: 'y' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).confirm).toMatch(/match/);
  });
});

describe('cleanDisplayName', () => {
  it('keeps valid names and strips the rest', () => {
    expect(cleanDisplayName('Twisha P.')).toBe('Twisha P.');
    expect(cleanDisplayName('  <Rocket>  Raja  ')).toBe('Rocket Raja');
    expect(cleanDisplayName('A very long name that keeps going')).toHaveLength(20);
  });

  it('falls back to Player', () => {
    expect(cleanDisplayName(undefined)).toBe('Player');
    expect(cleanDisplayName('🚀')).toBe('Player');
  });
});
