import { BOARD_META, buildLeaderboard, type BoardKey } from '@/lib/leaderboards';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ALL_BOARDS: BoardKey[] = ['overall', 'population', 'sheep', 'fifa_underdog', 'group_only', 'ko_only'];

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const { board } = await searchParams;
  const active = (ALL_BOARDS.includes(board as BoardKey) ? board : 'overall') as BoardKey;
  const rows = await buildLeaderboard(active);
  const meta = BOARD_META[active];

  return (
    <div className="space-y-6">
      <div className="brutal-card">
        <h1 className="text-xl font-bold">Leaderboards</h1>
        <p className="text-sm opacity-70">Same points, different lenses. Switch boards to find one you’re winning.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {ALL_BOARDS.map((k) => (
            <Link
              key={k}
              href={`/leaderboards?board=${k}`}
              className={`rounded-xl border px-3 py-1.5 text-sm ${
                active === k ? 'border-black bg-neon-lime text-white' : 'border-black/10 hover:border-black'
              }`}
            >
              {BOARD_META[k].label}
            </Link>
          ))}
        </div>
      </div>

      <div className="brutal-card">
        <h2 className="text-lg font-semibold">{meta.label}</h2>
        <p className="text-sm opacity-70">{meta.tagline}</p>
        <table className="mt-4 w-full text-left text-sm table-row-hover">
          <thead className="text-xs uppercase opacity-60">
            <tr>
              <th className="py-2">#</th>
              <th>Player</th>
              <th className="text-right">Teams</th>
              <th className="text-right">Raw pts</th>
              <th className="text-right">{meta.unit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center opacity-60">
                  No players yet — admin needs to invite people and run the draw.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.userId} className="border-t border-black/5">
                <td className="py-2 tabular-nums">{i + 1}</td>
                <td>{r.name}</td>
                <td className="text-right tabular-nums">{r.teamCount}</td>
                <td className="text-right tabular-nums">{r.points}</td>
                <td className="text-right font-semibold tabular-nums">{r.weightedPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
