'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { getSession } from '@/lib/session';
import { burnExpiry, validateBurnBody } from '@/lib/burns';

/**
 * Post a sitewide burn. Anyone signed-in; no rate limit (chaos mode).
 * 24h TTL set server-side so it doesn't depend on DB clock drift.
 */
export async function postBurnAction(formData: FormData) {
  const s = await getSession();
  if (!s.userId) redirect('/login');

  const result = validateBurnBody(formData.get('body'));
  if (!result.ok) redirect(`/?burnerr=${result.reason}`);

  await db.insert(schema.burns).values({
    userId: s.userId!,
    body: result.body,
    expiresAt: burnExpiry(new Date()),
  });
  redirect('/');
}

/**
 * Dismiss a burn early. Only the author OR an admin can. Soft delete via
 * `dismissed_at` so the archive page can still show what was said.
 */
export async function dismissBurnAction(formData: FormData) {
  const s = await getSession();
  if (!s.userId) redirect('/login');

  const burnId = Number(formData.get('burn_id'));
  if (!Number.isFinite(burnId) || burnId <= 0) redirect('/');

  const [row] = await db.select().from(schema.burns).where(eq(schema.burns.id, burnId)).limit(1);
  if (!row) redirect('/');
  if (row.userId !== s.userId && !s.isAdmin) redirect('/');

  await db.update(schema.burns).set({ dismissedAt: new Date() }).where(eq(schema.burns.id, burnId));
  redirect('/');
}
