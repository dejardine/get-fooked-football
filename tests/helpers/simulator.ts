/**
 * In-memory World Cup simulator.
 *
 * Builds 48 teams across 12 groups, generates every fixture (72 group + 32 KO),
 * deterministically picks scores via a seeded PRNG, and resolves the entire bracket.
 *
 * Returns the populated fixture list ready to feed into the scoring code.
 */
import type { Fixture, Team } from '@/db/schema';
import { mulberry32 } from '@/lib/draw';
import { makeFixture, makeTeam } from './factories';

const STAGES = ['GROUP', 'R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'] as const;

export function buildTeams(): Team[] {
  const teams: Team[] = [];
  const letters = 'ABCDEFGHIJKL';
  let id = 1;
  for (const g of letters) {
    for (let i = 0; i < 4; i++) {
      teams.push(makeTeam({ id: id++, name: `${g}${i + 1}`, groupName: g, fifaRank: 10 + id, population: 5_000_000 + id * 1_000, sheep: id * 100 }));
    }
  }
  return teams;
}

const GROUP_ROUNDS: Array<[number, number][]> = [
  [
    [0, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [3, 1],
  ],
  [
    [0, 3],
    [1, 2],
  ],
];

export function buildBlankFixtures(teams: Team[]): Fixture[] {
  const byGroup = new Map<string, Team[]>();
  for (const t of teams) {
    const arr = byGroup.get(t.groupName) ?? [];
    arr.push(t);
    byGroup.set(t.groupName, arr);
  }
  const fixtures: Fixture[] = [];
  let id = 1;
  // 12 groups × 3 rounds × 2 matches = 72 group fixtures
  for (let r = 0; r < 3; r++) {
    for (const [g, ts] of byGroup) {
      for (const [a, b] of GROUP_ROUNDS[r]) {
        fixtures.push(
          makeFixture({
            id: id++,
            stage: 'GROUP',
            groupName: g,
            homeTeamId: ts[a].id,
            awayTeamId: ts[b].id,
            kickoff: new Date(Date.UTC(2026, 5, 11 + r * 5, 18)),
          }),
        );
      }
    }
  }
  // 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3RD + 1 FINAL = 32 KO placeholders
  for (let i = 0; i < 16; i++) fixtures.push(makeFixture({ id: id++, stage: 'R32', kickoff: new Date(Date.UTC(2026, 5, 28 + Math.floor(i / 4), 18)) }));
  for (let i = 0; i < 8; i++) fixtures.push(makeFixture({ id: id++, stage: 'R16', kickoff: new Date(Date.UTC(2026, 6, 4 + Math.floor(i / 2), 18)) }));
  for (let i = 0; i < 4; i++) fixtures.push(makeFixture({ id: id++, stage: 'QF', kickoff: new Date(Date.UTC(2026, 6, 10 + Math.floor(i / 2), 18)) }));
  fixtures.push(makeFixture({ id: id++, stage: 'SF', kickoff: new Date(Date.UTC(2026, 6, 14, 20)) }));
  fixtures.push(makeFixture({ id: id++, stage: 'SF', kickoff: new Date(Date.UTC(2026, 6, 15, 20)) }));
  fixtures.push(makeFixture({ id: id++, stage: '3RD', kickoff: new Date(Date.UTC(2026, 6, 18, 16)) }));
  fixtures.push(makeFixture({ id: id++, stage: 'FINAL', kickoff: new Date(Date.UTC(2026, 6, 19, 19)) }));
  return fixtures;
}

type Standing = { teamId: number; pts: number; gf: number; ga: number };

function randScore(rng: () => number) {
  // 0..4 goals per side, skewed toward 0-2.
  const r = rng();
  if (r < 0.25) return 0;
  if (r < 0.55) return 1;
  if (r < 0.8) return 2;
  if (r < 0.93) return 3;
  return 4;
}

export type SimulationResult = {
  fixtures: Fixture[];
  champion: number;
  runnerUp: number;
  thirdPlace: number;
  fourthPlace: number;
  goldenBootTeam: number; // team that scored the most total goals in the tournament
};

/**
 * Runs a full deterministic tournament. Returns the same Fixture[] passed in,
 * mutated with realised scores + statuses.
 */
export function simulateTournament(teams: Team[], blank: Fixture[], seed: number): SimulationResult {
  const rng = mulberry32(seed);
  const fixtures = blank.map((f) => ({ ...f })); // shallow copy so callers see fresh data

  // ----- Group stage -----
  const groupFixtures = fixtures.filter((f) => f.stage === 'GROUP');
  for (const f of groupFixtures) {
    const h = randScore(rng);
    const a = randScore(rng);
    f.homeScore = h;
    f.awayScore = a;
    f.status = 'FINISHED';
  }

  // Compute group standings to seed R32 (top 2 per group + 8 best 3rd-placed).
  const standings = new Map<string, Standing[]>();
  for (const t of teams) {
    const arr = standings.get(t.groupName) ?? [];
    arr.push({ teamId: t.id, pts: 0, gf: 0, ga: 0 });
    standings.set(t.groupName, arr);
  }
  const byTeam = new Map<number, Standing>();
  for (const arr of standings.values()) for (const s of arr) byTeam.set(s.teamId, s);
  for (const f of groupFixtures) {
    const h = byTeam.get(f.homeTeamId!)!;
    const a = byTeam.get(f.awayTeamId!)!;
    h.gf += f.homeScore!;
    h.ga += f.awayScore!;
    a.gf += f.awayScore!;
    a.ga += f.homeScore!;
    if (f.homeScore! > f.awayScore!) h.pts += 3;
    else if (f.awayScore! > f.homeScore!) a.pts += 3;
    else {
      h.pts += 1;
      a.pts += 1;
    }
  }
  const sortStandings = (a: Standing, b: Standing) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || a.teamId - b.teamId;

  const firstPlaces: number[] = [];
  const secondPlaces: number[] = [];
  const thirdPlaces: Standing[] = [];
  for (const [, arr] of [...standings.entries()].sort(([x], [y]) => x.localeCompare(y))) {
    const sorted = arr.slice().sort(sortStandings);
    firstPlaces.push(sorted[0].teamId);
    secondPlaces.push(sorted[1].teamId);
    thirdPlaces.push(sorted[2]);
  }
  const top8Thirds = thirdPlaces.sort(sortStandings).slice(0, 8).map((s) => s.teamId);

  // Build a flat seeded R32 list (32 teams total). Bracket order doesn't matter for tests —
  // we just need every team to play and the bracket to feed forward.
  const r32Seeds = [...firstPlaces, ...secondPlaces, ...top8Thirds];

  const winners: number[] = [];
  const koByStage: Record<string, Fixture[]> = {
    R32: fixtures.filter((f) => f.stage === 'R32'),
    R16: fixtures.filter((f) => f.stage === 'R16'),
    QF: fixtures.filter((f) => f.stage === 'QF'),
    SF: fixtures.filter((f) => f.stage === 'SF'),
    '3RD': fixtures.filter((f) => f.stage === '3RD'),
    FINAL: fixtures.filter((f) => f.stage === 'FINAL'),
  };

  function playKO(roundTeams: number[], stage: keyof typeof koByStage): number[] {
    const matches = koByStage[stage];
    const survivors: number[] = [];
    for (let i = 0; i < matches.length; i++) {
      const f = matches[i];
      const home = roundTeams[i * 2];
      const away = roundTeams[i * 2 + 1];
      f.homeTeamId = home;
      f.awayTeamId = away;
      let h = randScore(rng);
      let a = randScore(rng);
      f.homeScore = h;
      f.awayScore = a;
      if (h === a) {
        // ET, possibly pens
        const he = randScore(rng);
        const ae = randScore(rng);
        f.homeScoreEt = h + he;
        f.awayScoreEt = a + ae;
        if (he === ae) {
          // pens — random 3-5 each, force different.
          let hp = 3 + Math.floor(rng() * 3);
          let ap = 3 + Math.floor(rng() * 3);
          if (hp === ap) ap += 1;
          f.homePens = hp;
          f.awayPens = ap;
          survivors.push(hp > ap ? home : away);
        } else {
          survivors.push(he > ae ? home : away);
        }
      } else {
        survivors.push(h > a ? home : away);
      }
      f.status = 'FINISHED';
    }
    return survivors;
  }

  const r32Winners = playKO(r32Seeds, 'R32'); // 16
  const r16Winners = playKO(r32Winners, 'R16'); // 8
  const qfWinners = playKO(r16Winners, 'QF'); // 4
  // For SF & onwards we need to remember losers too — but playKO returns winners; rerun manually.
  // Build a manual SF + 3rd + Final stage.
  // SF
  const sfMatches = koByStage.SF;
  const sfWinners: number[] = [];
  const sfLosers: number[] = [];
  for (let i = 0; i < sfMatches.length; i++) {
    const f = sfMatches[i];
    f.homeTeamId = qfWinners[i * 2];
    f.awayTeamId = qfWinners[i * 2 + 1];
    let h = randScore(rng);
    let a = randScore(rng);
    if (h === a) a = h + 1; // simple decisive
    f.homeScore = h;
    f.awayScore = a;
    f.status = 'FINISHED';
    if (h > a) {
      sfWinners.push(f.homeTeamId);
      sfLosers.push(f.awayTeamId);
    } else {
      sfWinners.push(f.awayTeamId);
      sfLosers.push(f.homeTeamId);
    }
  }
  // 3rd-place playoff
  const tpf = koByStage['3RD'][0];
  tpf.homeTeamId = sfLosers[0];
  tpf.awayTeamId = sfLosers[1];
  {
    let h = randScore(rng);
    let a = randScore(rng);
    if (h === a) h = a + 1;
    tpf.homeScore = h;
    tpf.awayScore = a;
    tpf.status = 'FINISHED';
  }
  // Final
  const finalF = koByStage.FINAL[0];
  finalF.homeTeamId = sfWinners[0];
  finalF.awayTeamId = sfWinners[1];
  let fh = randScore(rng);
  let fa = randScore(rng);
  if (fh === fa) fh = fa + 1;
  finalF.homeScore = fh;
  finalF.awayScore = fa;
  finalF.status = 'FINISHED';

  const champion = fh > fa ? finalF.homeTeamId! : finalF.awayTeamId!;
  const runnerUp = fh > fa ? finalF.awayTeamId! : finalF.homeTeamId!;
  const thirdPlace = tpf.homeScore! > tpf.awayScore! ? tpf.homeTeamId! : tpf.awayTeamId!;
  const fourthPlace = tpf.homeScore! > tpf.awayScore! ? tpf.awayTeamId! : tpf.homeTeamId!;

  // Total goals scored per team across the tournament
  const goalTally = new Map<number, number>();
  for (const f of fixtures) {
    if (f.status !== 'FINISHED') continue;
    goalTally.set(f.homeTeamId!, (goalTally.get(f.homeTeamId!) ?? 0) + (f.homeScore ?? 0));
    goalTally.set(f.awayTeamId!, (goalTally.get(f.awayTeamId!) ?? 0) + (f.awayScore ?? 0));
  }
  const goldenBootTeam = [...goalTally.entries()].sort((a, b) => b[1] - a[1])[0][0];

  return { fixtures, champion, runnerUp, thirdPlace, fourthPlace, goldenBootTeam };
}
