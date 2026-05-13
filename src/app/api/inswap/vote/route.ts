import { NextResponse } from 'next/server';
import { db, schema } from '@/db/client';
import { and, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inswap/vote { photoId } — toggles the current user's thumbs-up on
 * the given photo. Responds with { voted, count } so the client can update
 * the button without a page reload.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let photoId: number;
  try {
    const body = await req.json();
    photoId = Number(body.photoId);
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  if (!Number.isFinite(photoId)) return NextResponse.json({ error: 'bad photoId' }, { status: 400 });

  const existing = await db
    .select()
    .from(schema.photoVotes)
    .where(and(eq(schema.photoVotes.photoId, photoId), eq(schema.photoVotes.userId, session.userId)))
    .limit(1);

  let voted: boolean;
  if (existing.length > 0) {
    await db
      .delete(schema.photoVotes)
      .where(and(eq(schema.photoVotes.photoId, photoId), eq(schema.photoVotes.userId, session.userId)));
    voted = false;
  } else {
    await db.insert(schema.photoVotes).values({ photoId, userId: session.userId });
    voted = true;
  }

  const count = await db.execute(
    sql`select count(*)::int as c from photo_votes where photo_id = ${photoId}`,
  );
  const c = Number((count.rows[0] as { c: number } | undefined)?.c ?? 0);
  return NextResponse.json({ voted, count: c });
}
