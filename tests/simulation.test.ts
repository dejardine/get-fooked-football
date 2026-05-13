import { describe, it, expect } from 'vitest';
import { buildTeams, buildBlankFixtures, simulateTournament } from './helpers/simulator';
import { computeTeamScores } from '@/lib/scoring';
import { computeLeaderboard } from '@/lib/leaderboards';
import { planDraw, mulberry32 } from '@/lib/draw';
import { makeUser } from './helpers/factories';

describe('full tournament simulation', () => {
  const teams = buildTeams();
  const blank = buildBlankFixtures(teams);

  it('produces 48 teams and 104 fixtures of the expected shape', () => {
    expect(teams).toHaveLength(48);
    expect(blank).toHaveLength(104);
    const stageCounts = blank.reduce<Record<string, number>>((acc, f) => {
      acc[f.stage] = (acc[f.stage] ?? 0) + 1;
      return acc;
    }, {});
    expect(stageCounts).toEqual({ GROUP: 72, R32: 16, R16: 8, QF: 4, SF: 2, '3RD': 1, FINAL: 1 });
  });

  it('simulating a tournament finishes every match and picks a single champion', () => {
    const { fixtures, champion, runnerUp, thirdPlace } = simulateTournament(teams, blank, 12345);
    expect(fixtures.every((f) => f.status === 'FINISHED')).toBe(true);
    expect(champion).not.toBe(runnerUp);
    expect(champion).not.toBe(thirdPlace);
    expect(runnerUp).not.toBe(thirdPlace);
  });

  it('the champion takes home +30 from the Final (plus their goal points)', () => {
    const { fixtures, champion } = simulateTournament(teams, blank, 7);
    const scores = computeTeamScores(fixtures, teams);
    const finalF = fixtures.find((f) => f.stage === 'FINAL')!;
    const championGoals = finalF.homeTeamId === champion ? finalF.homeScore! : finalF.awayScore!;
    const championFinalContribution = 30 + Math.min(championGoals, 4);
    // The champion's total points must include at least the Final's contribution.
    expect(scores.get(champion)!.points).toBeGreaterThanOrEqual(championFinalContribution);
  });

  it('the runner-up earns +15 from the Final', () => {
    const { fixtures, runnerUp } = simulateTournament(teams, blank, 7);
    const scores = computeTeamScores(fixtures, teams);
    const finalF = fixtures.find((f) => f.stage === 'FINAL')!;
    const runnerUpGoals = finalF.homeTeamId === runnerUp ? finalF.homeScore! : finalF.awayScore!;
    const runnerUpFinalContribution = 15 + Math.min(runnerUpGoals, 4);
    expect(scores.get(runnerUp)!.points).toBeGreaterThanOrEqual(runnerUpFinalContribution);
  });

  it('all team points are non-negative', () => {
    const { fixtures } = simulateTournament(teams, blank, 99);
    const scores = computeTeamScores(fixtures, teams);
    for (const s of scores.values()) expect(s.points).toBeGreaterThanOrEqual(0);
  });

  it('leaderboard total points = sum of scores of every assigned team (no leakage to leftover)', () => {
    const { fixtures } = simulateTournament(teams, blank, 314);
    const users = Array.from({ length: 7 }, (_, i) => makeUser({ id: i + 1, name: `Player${i + 1}` }));
    const plan = planDraw(teams.map((t) => t.id), users.map((u) => u.id), mulberry32(2026));
    const board = computeLeaderboard('overall', users, teams, plan.assignments, fixtures);

    const teamScores = computeTeamScores(fixtures, teams);
    let assignedPointsSum = 0;
    for (const a of plan.assignments) {
      if (a.userId == null || a.isLeftover) continue;
      assignedPointsSum += teamScores.get(a.teamId)?.points ?? 0;
    }
    const boardSum = board.reduce((s, r) => s + r.points, 0);
    expect(boardSum).toBe(assignedPointsSum);

    // Every player who got teams has a row.
    expect(board.filter((r) => r.teamCount > 0).length).toBe(users.length);
  });

  it('the leaderboard is monotonic — sorted descending by weighted points', () => {
    const { fixtures } = simulateTournament(teams, blank, 31415);
    const users = Array.from({ length: 7 }, (_, i) => makeUser({ id: i + 1, name: `Player${i + 1}` }));
    const plan = planDraw(teams.map((t) => t.id), users.map((u) => u.id), mulberry32(99));
    for (const kind of ['overall', 'population', 'sheep', 'fifa_underdog', 'group_only', 'ko_only'] as const) {
      const board = computeLeaderboard(kind, users, teams, plan.assignments, fixtures);
      for (let i = 1; i < board.length; i++) {
        expect(board[i].weightedPoints).toBeLessThanOrEqual(board[i - 1].weightedPoints);
      }
    }
  });

  it('different seeds yield different champions (at least sometimes)', () => {
    const champs = new Set<number>();
    for (let s = 1; s <= 25; s++) {
      const result = simulateTournament(teams, buildBlankFixtures(teams), s);
      champs.add(result.champion);
    }
    expect(champs.size).toBeGreaterThan(1);
  });

  it('the tournament is deterministic for a given seed', () => {
    const a = simulateTournament(teams, buildBlankFixtures(teams), 555);
    const b = simulateTournament(teams, buildBlankFixtures(teams), 555);
    expect(a.champion).toBe(b.champion);
    expect(a.runnerUp).toBe(b.runnerUp);
    expect(a.fixtures.map((f) => `${f.homeScore}-${f.awayScore}`)).toEqual(b.fixtures.map((f) => `${f.homeScore}-${f.awayScore}`));
  });
});
