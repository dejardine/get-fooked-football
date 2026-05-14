/**
 * Pure helpers for the sitewide "burn of the day" banner.
 *
 * Anyone can post; auto-expires after 24 hours; no rate limit (chaos mode).
 * Author or admin can dismiss a burn before it expires.
 *
 * For the live "X left" rendering we reuse `formatTimeRemaining` from
 * `src/lib/group-invite.ts` — same UX vocabulary as the group-invite ticker.
 */

export const BURN_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_BURN_LEN = 140;

export type BurnValidation =
  | { ok: true; body: string }
  | { ok: false; reason: 'empty' | 'too-long' };

export function validateBurnBody(raw: unknown): BurnValidation {
  const body = typeof raw === 'string' ? raw.trim() : '';
  if (body.length === 0) return { ok: false, reason: 'empty' };
  if (body.length > MAX_BURN_LEN) return { ok: false, reason: 'too-long' };
  return { ok: true, body };
}

/** Compute when a freshly-posted burn should auto-expire. */
export function burnExpiry(now: Date): Date {
  return new Date(now.getTime() + BURN_TTL_MS);
}
