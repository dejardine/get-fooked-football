import { describe, it, expect } from 'vitest';
import { pointsForFixture, computeTeamScores } from '@/lib/scoring';
import { finishedGroup, makeFixture, makeTeam } from './helpers/factories';

describe('pointsForFixture — group stage', () => {
  it('awards a 3-1 win as: winner +3+goals(cap 4), loser +0+goals', () => {
    const f = finishedGroup(1, 3, 1, 10, 20);
    const p = pointsForFixture(f);
    // win = 3, goals 3 (capped 4 = 3) → 6.  Loser goals 1 → 1.
    expect(p.home).toBe(6);
    expect(p.away).toBe(1);
  });

  it('caps goal points at 4 even on a 5-0 thrashing', () => {
    const f = finishedGroup(2, 5, 0, 1, 2);
    const p = pointsForFixture(f);
    expect(p.home).toBe(3 + 4); // 7
    expect(p.away).toBe(0);
  });

  it('a 0-0 draw is 1 point each', () => {
    const f = finishedGroup(3, 0, 0, 1, 2);
    const p = pointsForFixture(f);
    expect(p.home).toBe(1);
    expect(p.away).toBe(1);
  });

  it('a 2-2 draw is 3 each (1 for draw + 2 goals)', () => {
    const f = finishedGroup(4, 2, 2, 1, 2);
    const p = pointsForFixture(f);
    expect(p.home).toBe(3);
    expect(p.away).toBe(3);
  });

  it('awards nothing for a SCHEDULED match', () => {
    const f = makeFixture({ id: 5, stage: 'GROUP', homeTeamId: 1, awayTeamId: 2, homeScore: 5, awayScore: 0, status: 'SCHEDULED' });
    expect(pointsForFixture(f)).toEqual({ homeTeamId: 1, awayTeamId: 2, home: 0, away: 0 });
  });
});

describe('pointsForFixture — knockouts', () => {
  it('R32 winner picks up +4 bonus + goals; loser still gets goals', () => {
    const f = makeFixture({ id: 10, stage: 'R32', homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1, status: 'FINISHED' });
    const p = pointsForFixture(f);
    expect(p.home).toBe(2 + 4); // 2 goals + 4 advance bonus
    expect(p.away).toBe(1);
  });

  it('decides KO ties by extra-time score', () => {
    const f = makeFixture({
      id: 11,
      stage: 'R16',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 1,
      awayScore: 1,
      homeScoreEt: 2,
      awayScoreEt: 1,
      status: 'FINISHED',
    });
    const p = pointsForFixture(f);
    // home wins via ET. Home: 1 goal + 6 bonus = 7. Away: 1.
    expect(p.home).toBe(1 + 6);
    expect(p.away).toBe(1);
  });

  it('decides KO ties by penalties when ET also drawn', () => {
    const f = makeFixture({
      id: 12,
      stage: 'QF',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 0,
      awayScore: 0,
      homeScoreEt: 0,
      awayScoreEt: 0,
      homePens: 4,
      awayPens: 5,
      status: 'FINISHED',
    });
    const p = pointsForFixture(f);
    expect(p.home).toBe(0);
    expect(p.away).toBe(0 + 8); // QF bonus
  });

  it('Final: champion 30, runner-up 15', () => {
    const f = makeFixture({ id: 99, stage: 'FINAL', homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0, status: 'FINISHED' });
    const p = pointsForFixture(f);
    expect(p.home).toBe(2 + 30);
    expect(p.away).toBe(0 + 15);
  });
});

describe('computeTeamScores', () => {
  it('accumulates W/D/L and goal difference across multiple matches', () => {
    const teams = [makeTeam({ id: 1, name: 'Alpha' }), makeTeam({ id: 2, name: 'Bravo' }), makeTeam({ id: 3, name: 'Charlie' })];
    const fixtures = [
      finishedGroup(1, 2, 1, 1, 2),
      finishedGroup(2, 0, 0, 1, 3),
      finishedGroup(3, 1, 3, 2, 3),
    ];
    const m = computeTeamScores(fixtures, teams);
    const a = m.get(1)!;
    expect(a.w).toBe(1);
    expect(a.d).toBe(1);
    expect(a.l).toBe(0);
    expect(a.gf).toBe(2);
    expect(a.ga).toBe(1);

    const c = m.get(3)!;
    expect(c.w).toBe(1); // beat Bravo 3-1
    expect(c.d).toBe(1); // 0-0 vs Alpha
    expect(c.gf).toBe(3);
    expect(c.ga).toBe(1);
  });

  it('ignores fixtures with missing teams or unfinished status', () => {
    const teams = [makeTeam({ id: 1, name: 'A' }), makeTeam({ id: 2, name: 'B' })];
    const fixtures = [
      makeFixture({ id: 1, stage: 'GROUP', homeTeamId: 1, awayTeamId: 2, homeScore: 3, awayScore: 0, status: 'SCHEDULED' }),
      makeFixture({ id: 2, stage: 'R32', homeLabel: 'Winner A1', awayLabel: 'Winner B2', homeScore: 1, awayScore: 0, status: 'FINISHED' }),
    ];
    const m = computeTeamScores(fixtures, teams);
    expect(m.get(1)!.points).toBe(0);
    expect(m.get(2)!.points).toBe(0);
  });
});
