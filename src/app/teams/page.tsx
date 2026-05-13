import { db, schema } from '@/db/client';
import { eq, asc } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { computeTeamScores } from '@/lib/scoring';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MyTeamsPage() {
  const session = await getSession();
  if (!session.userId) {
    return (
      <div className="brutal-card">
        <p>
          You need to <Link className="brutal-link hover:underline" href="/login">sign in</Link> to see your assigned teams.
        </p>
      </div>
    );
  }

  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.groupName));
  const assignments = await db.select().from(schema.teamAssignments);
  const fixtures = await db.select().from(schema.fixtures);
  const teamById = new Map(teams.map((t) => [t.id, t] as const));
  const scores = computeTeamScores(fixtures, teams);

  const myAssignments = assignments.filter((a) => a.userId === session.userId);
  const myTeams = myAssignments.map((a) => teamById.get(a.teamId)).filter(Boolean) as typeof teams;
  const leftovers = assignments.filter((a) => a.isLeftover).map((a) => teamById.get(a.teamId)).filter(Boolean) as typeof teams;
  const drawDone = assignments.length > 0;

  const totals = myTeams.reduce(
    (acc, t) => {
      acc.population += t.population;
      acc.sheep += t.sheep;
      acc.fifaRank += t.fifaRank;
      acc.points += scores.get(t.id)?.points ?? 0;
      return acc;
    },
    { population: 0, sheep: 0, fifaRank: 0, points: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="brutal-card">
        <h1 className="text-xl font-bold">My Teams</h1>
        {!drawDone && <p className="opacity-70">The draw hasn’t happened yet — sit tight.</p>}
        {drawDone && myTeams.length === 0 && (
          <p className="opacity-70">
            You weren’t assigned any teams in this draw. Talk to the admin if that’s a mistake.
          </p>
        )}
        {myTeams.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Tile label="Teams" value={String(myTeams.length)} />
            <Tile label="Points" value={String(totals.points)} />
            <Tile label="Combined population" value={fmtNumber(totals.population)} />
            <Tile label="Combined sheep" value={fmtNumber(totals.sheep)} />
          </div>
        )}
      </div>

      {myTeams.length > 0 && (
        <div className="brutal-card">
          <h2 className="text-lg font-semibold">Your draw</h2>
          <TeamTable teams={myTeams} scores={scores} />
        </div>
      )}

      {leftovers.length > 0 && (
        <div className="brutal-card">
          <h2 className="text-lg font-semibold">Leftover teams</h2>
          <p className="text-sm opacity-70">
            These teams didn’t get drawn to anyone. They’re reserved for special side-prizes — the Wooden Spoon, the Cinderella Cup,
            and whatever the admin dreams up next.
          </p>
          <div className="mt-3">
            <TeamTable teams={leftovers} scores={scores} />
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/5 px-3 py-2 dark:bg-white/5">
      <div className="text-xs uppercase opacity-60">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function fmtNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function TeamTable({
  teams,
  scores,
}: {
  teams: { id: number; flag: string; name: string; groupName: string; fifaRank: number; population: number; sheep: number }[];
  scores: Map<number, { points: number; w: number; d: number; l: number; gf: number; ga: number }>;
}) {
  return (
    <table className="mt-2 w-full text-left text-sm table-row-hover">
      <thead className="text-xs uppercase opacity-60">
        <tr>
          <th className="py-2">Team</th>
          <th>Group</th>
          <th className="text-right">FIFA rank</th>
          <th className="text-right">Population</th>
          <th className="text-right">Sheep</th>
          <th className="text-right">W-D-L</th>
          <th className="text-right">Pts</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((t) => {
          const s = scores.get(t.id);
          return (
            <tr key={t.id} className="border-t border-black/5">
              <td className="py-2">{t.flag} {t.name}</td>
              <td>{t.groupName}</td>
              <td className="text-right tabular-nums">{t.fifaRank}</td>
              <td className="text-right tabular-nums">{fmtNumber(t.population)}</td>
              <td className="text-right tabular-nums">{fmtNumber(t.sheep)}</td>
              <td className="text-right tabular-nums">{s ? `${s.w}-${s.d}-${s.l}` : '0-0-0'}</td>
              <td className="text-right font-semibold tabular-nums">{s?.points ?? 0}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
