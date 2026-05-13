import type { Fixture, Team } from '@/db/schema';

// Tipping model: each player owns N teams (random draw). Their score is the sum of
// points earned by every team they own across the whole tournament.
//
// Per match a team earns:
//   GROUP:   win 3, draw 1, loss 0, plus 1 per goal scored (with cap 4)
//   R32:     advance bonus 4
//   R16:     advance bonus 6
//   QF:      advance bonus 8
//   SF:      advance bonus 12
//   FINAL:   runner-up 15, winner 30
//
// Bonus is awarded once the match is FINISHED to the advancing side.
const STAGE_ADVANCE: Record<string, number> = {
  R32: 4,
  R16: 6,
  QF: 8,
  SF: 12,
};

export type MatchPoints = { homeTeamId?: number; awayTeamId?: number; home: number; away: number };

function winnerSide(f: Fixture): 'home' | 'away' | 'draw' {
  if (f.status !== 'FINISHED') return 'draw';
  const hs = f.homeScore ?? 0;
  const as = f.awayScore ?? 0;
  if (hs > as) return 'home';
  if (as > hs) return 'away';
  // KO stages need ET / pens
  const het = f.homeScoreEt ?? hs;
  const aet = f.awayScoreEt ?? as;
  if (het > aet) return 'home';
  if (aet > het) return 'away';
  const hp = f.homePens ?? 0;
  const ap = f.awayPens ?? 0;
  if (hp > ap) return 'home';
  if (ap > hp) return 'away';
  return 'draw';
}

export function pointsForFixture(f: Fixture): MatchPoints {
  const out: MatchPoints = { homeTeamId: f.homeTeamId ?? undefined, awayTeamId: f.awayTeamId ?? undefined, home: 0, away: 0 };
  if (f.status !== 'FINISHED' || f.homeTeamId == null || f.awayTeamId == null) return out;
  const hs = f.homeScore ?? 0;
  const as = f.awayScore ?? 0;
  const cap = (n: number) => Math.min(n, 4);
  if (f.stage === 'GROUP') {
    if (hs > as) {
      out.home += 3;
      out.away += 0;
    } else if (as > hs) {
      out.away += 3;
    } else {
      out.home += 1;
      out.away += 1;
    }
    out.home += cap(hs);
    out.away += cap(as);
    return out;
  }
  // KO: goal points + advance bonus to winner
  out.home += cap(hs);
  out.away += cap(as);
  const w = winnerSide(f);
  if (f.stage === 'FINAL') {
    if (w === 'home') {
      out.home += 30;
      out.away += 15;
    } else if (w === 'away') {
      out.away += 30;
      out.home += 15;
    }
  } else {
    const bonus = STAGE_ADVANCE[f.stage] ?? 0;
    if (w === 'home') out.home += bonus;
    else if (w === 'away') out.away += bonus;
  }
  return out;
}

export type TeamScore = { teamId: number; points: number; gp: number; w: number; d: number; l: number; gf: number; ga: number };

export function computeTeamScores(fixtures: Fixture[], teams: Team[]): Map<number, TeamScore> {
  const map = new Map<number, TeamScore>();
  for (const t of teams) {
    map.set(t.id, { teamId: t.id, points: 0, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 });
  }
  for (const f of fixtures) {
    if (f.status !== 'FINISHED' || f.homeTeamId == null || f.awayTeamId == null) continue;
    const pts = pointsForFixture(f);
    const h = map.get(f.homeTeamId);
    const a = map.get(f.awayTeamId);
    if (!h || !a) continue;
    const hs = f.homeScore ?? 0;
    const as = f.awayScore ?? 0;
    h.points += pts.home;
    a.points += pts.away;
    h.gp += 1;
    a.gp += 1;
    h.gf += hs;
    h.ga += as;
    a.gf += as;
    a.ga += hs;
    if (hs > as) {
      h.w += 1;
      a.l += 1;
    } else if (as > hs) {
      a.w += 1;
      h.l += 1;
    } else {
      h.d += 1;
      a.d += 1;
    }
  }
  return map;
}
