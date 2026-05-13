import { db, schema } from '@/db/client';
import { asc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  GRAND: 'The Grand Prize',
  BOARD: 'Themed leaderboards',
  SPECIAL: 'Special prizes',
  INSWAP: 'InSwap League',
};

const CATEGORY_ORDER = ['GRAND', 'BOARD', 'SPECIAL', 'INSWAP'];

export default async function PrizesPage() {
  const prizes = await db.select().from(schema.prizes).orderBy(asc(schema.prizes.sortOrder));
  const playerCount = (await db.select({ id: schema.users.id }).from(schema.users)).length;
  const buyIn = Number(process.env.BUY_IN_NZD ?? 100);
  const pot = playerCount * buyIn;
  const allocated = prizes.reduce((s, p) => s + (p.amountNzd ?? 0), 0);

  const grouped = new Map<string, typeof prizes>();
  for (const p of prizes) {
    const arr = grouped.get(p.category) ?? [];
    arr.push(p);
    grouped.set(p.category, arr);
  }

  return (
    <div className="space-y-6">
      <div className="brutal-card">
        <h1 className="text-xl font-bold">Prizes</h1>
        <p className="text-sm opacity-70">${buyIn} each. {playerCount} player{playerCount === 1 ? '' : 's'} signed up so far = ${pot} pot.</p>
        {allocated > pot && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            Allocated prizes total ${allocated}, which is more than the current pot of ${pot}. As more players join, the pot grows.
            Admin can adjust amounts on the admin page.
          </p>
        )}
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const list = grouped.get(cat);
        if (!list || list.length === 0) return null;
        return (
          <section key={cat} className="brutal-card">
            <h2 className="mb-3 text-lg font-semibold">{CATEGORY_LABEL[cat] ?? cat}</h2>
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.id} className="flex items-start gap-3 rounded-lg border border-black/5 p-3">
                  <div className="rounded-lg bg-neon-lime px-3 py-1 text-sm font-semibold text-white tabular-nums">
                    ${p.amountNzd}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm opacity-70">{p.description}</div>
                    {p.awardedUserId && <div className="mt-1 text-xs brutal-link">Awarded</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
