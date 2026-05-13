import { NextResponse } from 'next/server';
import { BOARD_META, buildLeaderboard, type BoardKey } from '@/lib/leaderboards';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set<BoardKey>(Object.keys(BOARD_META) as BoardKey[]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const requested = url.searchParams.get('board') ?? 'overall';
  const board = (ALLOWED.has(requested as BoardKey) ? requested : 'overall') as BoardKey;
  try {
    const rows = await buildLeaderboard(board);
    return NextResponse.json({ board, meta: BOARD_META[board], rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed' },
      { status: 500 },
    );
  }
}
