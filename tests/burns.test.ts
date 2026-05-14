import { describe, it, expect } from 'vitest';
import { burnExpiry, BURN_TTL_MS, MAX_BURN_LEN, validateBurnBody } from '@/lib/burns';

describe('validateBurnBody', () => {
  it('accepts a normal burn', () => {
    expect(validateBurnBody('Robin still has England as his top seed')).toEqual({
      ok: true,
      body: 'Robin still has England as his top seed',
    });
  });
  it('trims whitespace', () => {
    expect(validateBurnBody('   bin fire szn   ')).toEqual({ ok: true, body: 'bin fire szn' });
  });
  it('rejects empty bodies', () => {
    expect(validateBurnBody('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateBurnBody('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(validateBurnBody(null)).toEqual({ ok: false, reason: 'empty' });
    expect(validateBurnBody(undefined)).toEqual({ ok: false, reason: 'empty' });
  });
  it('rejects too-long bodies', () => {
    expect(validateBurnBody('x'.repeat(MAX_BURN_LEN + 1))).toEqual({ ok: false, reason: 'too-long' });
  });
  it('accepts exactly at the limit', () => {
    expect(validateBurnBody('x'.repeat(MAX_BURN_LEN))).toEqual({
      ok: true,
      body: 'x'.repeat(MAX_BURN_LEN),
    });
  });
});

describe('burnExpiry', () => {
  it('returns now + 24h', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const exp = burnExpiry(now);
    expect(exp.getTime() - now.getTime()).toBe(BURN_TTL_MS);
    expect(BURN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
