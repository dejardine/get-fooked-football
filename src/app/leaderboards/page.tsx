import { BOARD_META, buildLeaderboard, type BoardKey } from '@/lib/leaderboards';
import LeaderboardClient from './_client';

export const dynamic = 'force-dynamic';

const ALL_BOARDS = Object.keys(BOARD_META) as BoardKey[];

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const { board } = await searchParams;
  const active = (ALL_BOARDS.includes(board as BoardKey) ? board : 'overall') as BoardKey;
  const rows = await buildLeaderboard(active);
  return (
    <div className="space-y-6">
      <LeaderboardClient initialBoard={active} initialRows={rows} initialMeta={BOARD_META[active]} />
    </div>
  );
}
