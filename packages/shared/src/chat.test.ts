import { describe, expect, it } from 'vitest';
import { CHAT_MAX_LENGTH, chatReportSchema, chatSendSchema } from './chat.js';

const text = (value: unknown) => chatSendSchema.safeParse({ text: value });
/** Builds strings with invisible characters at run time, so this file contains none. */
const chars = (...points: number[]) => String.fromCodePoint(...points);
const NUL = chars(0x0000);
const ZERO_WIDTH_SPACE = chars(0x200b);
const RIGHT_TO_LEFT_OVERRIDE = chars(0x202e);

describe('chat messages', () => {
  it('trims and squashes whitespace', () => {
    expect(chatSendSchema.parse({ text: '  buy   Kuber\n\nnow  ' })).toEqual({
      text: 'buy Kuber now',
    });
  });

  it('removes control and invisible characters that could hide text', () => {
    const sneaky = `hi${NUL}${ZERO_WIDTH_SPACE}there${RIGHT_TO_LEFT_OVERRIDE}`;
    expect(chatSendSchema.parse({ text: sneaky }).text).toBe('hi there');
  });

  it('refuses empty, over-long, non-text or extra fields', () => {
    expect(text('   ').success).toBe(false);
    expect(text(ZERO_WIDTH_SPACE.repeat(3)).success).toBe(false);
    expect(text('x'.repeat(CHAT_MAX_LENGTH + 1)).success).toBe(false);
    expect(text(42).success).toBe(false);
    expect(chatSendSchema.safeParse({ text: 'hi', name: 'Host' }).success).toBe(false);
  });

  it('accepts exactly the limit, and keeps markup as plain text for React to escape', () => {
    expect(text('x'.repeat(CHAT_MAX_LENGTH)).success).toBe(true);
    expect(chatSendSchema.parse({ text: '<b>hi</b>' }).text).toBe('<b>hi</b>');
  });

  it('only accepts well-formed message ids in reports', () => {
    expect(chatReportSchema.safeParse({ messageId: 'c_abcdefghijkl' }).success).toBe(true);
    expect(chatReportSchema.safeParse({ messageId: '../../etc' }).success).toBe(false);
  });
});
