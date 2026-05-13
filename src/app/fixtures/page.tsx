import Link from 'next/link';
import { db, schema } from '@/db/client';
import { asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const STAGE_LABEL: Record<string, string> = {
  GROUP: 'Group',
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  '3RD': '3rd-place playoff',
  FINAL: 'Final',
};

export default async function FixturesPage() {
  const fixtures = await db.select().from(schema.fixtures).orderBy(asc(schema.fixtures.kickoff));
  const teams = await db.select().from(schema.teams);
  const teamById = new Map(teams.map((t) => [t.id, t] as const));

  const byDay = new Map<string, typeof fixtures>();
  for (const f of fixtures) {
    const day = new Date(f.kickoff).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const arr = byDay.get(day) ?? [];
    arr.push(f);
    byDay.set(day, arr);
  }

  return (
    <div className="space-y-6">
      <div className="brutal-card">
        <h1 className="text-xl font-bold">Fixture Calendar</h1>
        <p className="text-sm opacity-70">All 104 matches of the 2026 World Cup. Times in your local timezone.</p>
      </div>

      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="brutal-card">
          <h2 className="mb-3 text-base font-semibold opacity-80">{day}</h2>
          <ul className="space-y-1">
            {list.map((f) => {
              const home = f.homeTeamId ? teamById.get(f.homeTeamId) : undefined;
              const away = f.awayTeamId ? teamById.get(f.awayTeamId) : undefined;
              const time = new Date(f.kickoff).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              return (
                <Link key={f.id} href={`/match/${f.id}`} className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-black/5">
                  <span className="text-xs tabular-nums opacity-70">{time}</span>
                  <span className="truncate">
                    <span className="mr-2 inline-block min-w-[6rem] rounded bg-black/5 px-2 py-0.5 text-xs uppercase opacity-70">
                      {STAGE_LABEL[f.stage] ?? f.stage}
                      {f.groupName ? ` ${f.groupName}` : ''}
                    </span>
                    {home ? `${home.flag} ${home.name}` : (f.homeLabel ?? 'TBD')}
                    <span className="px-2 opacity-50">vs</span>
                    {away ? `${away.flag} ${away.name}` : (f.awayLabel ?? 'TBD')}
                  </span>
                  <span className="text-sm tabular-nums">
                    {f.status === 'FINISHED' ? (
                      <strong>
                        {f.homeScore} – {f.awayScore}
                      </strong>
                    ) : (
                      <span className="opacity-50">—</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
