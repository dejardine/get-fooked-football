import { describe, it, expect } from 'vitest';
import { computeLeaderboard } from '@/lib/leaderboards';
import { finishedGroup, makeTeam, makeUser } from './helpers/factories';

describe('computeLeaderboard', () => {
  const users = [makeUser({ id: 1, name: 'Robin' }), makeUser({ id: 2, name: 'Sam' })];
  // Robin owns 2 sheep-heavy nations; Sam owns 2 huge-population nations.
  // Team 5 is unassigned (leftover); team 6 is a filler opponent so fixtures resolve cleanly.
  const teams = [
    makeTeam({ id: 1, name: 'New Zealand', population: 5_000_000, sheep: 25_000_000, fifaRank: 95 }),
    makeTeam({ id: 2, name: 'Wales', population: 3_000_000, sheep: 10_000_000, fifaRank: 30 }),
    makeTeam({ id: 3, name: 'India-like', population: 1_000_000_000, sheep: 1_000_000, fifaRank: 100 }),
    makeTeam({ id: 4, name: 'USA-like', population: 300_000_000, sheep: 5_000_000, fifaRank: 16 }),
    makeTeam({ id: 5, name: 'Leftover', population: 1, sheep: 1, fifaRank: 1 }),
    makeTeam({ id: 6, name: 'Filler', population: 0, sheep: 0, fifaRank: 200 }),
  ];
  const assignments = [
    { teamId: 1, userId: 1, isLeftover: false },
    { teamId: 2, userId: 1, isLeftover: false },
    { teamId: 3, userId: 2, isLeftover: false },
    { teamId: 4, userId: 2, isLeftover: false },
    { teamId: 5, userId: null, isLeftover: true },
    { teamId: 6, userId: null, isLeftover: true },
  ];

  // Each of the four assigned teams beats Filler 1-0 → +4 (3 win + 1 goal).
  const fixtures = [
    finishedGroup(1, 1, 0, 1, 6),
    finishedGroup(2, 1, 0, 2, 6),
    finishedGroup(3, 1, 0, 3, 6),
    finishedGroup(4, 1, 0, 4, 6),
  ];

  it('overall: raw points, sorted desc, tie broken by name', () => {
    const board = computeLeaderboard('overall', users, teams, assignments, fixtures);
    expect(board.map((r) => [r.name, r.points])).toEqual([
      ['Robin', 8],
      ['Sam', 8],
    ]);
  });

  it('population: weights big populations higher', () => {
    const board = computeLeaderboard('population', users, teams, assignments, fixtures);
    expect(board[0].name).toBe('Sam'); // 1.3B population × 8 pts ≫ Robin's 8M × 8 pts
  });

  it('sheep: weights woolly nations higher', () => {
    const board = computeLeaderboard('sheep', users, teams, assignments, fixtures);
    expect(board[0].name).toBe('Robin'); // 35M sheep ≫ 6M sheep
  });

  it('underdog: weights weaker teams higher (higher FIFA rank number)', () => {
    const board = computeLeaderboard('fifa_underdog', users, teams, assignments, fixtures);
    // Robin avg rank (95+30)/2 = 62.5; Sam (100+16)/2 = 58. Robin wins.
    expect(board[0].name).toBe('Robin');
  });

  it('group_only equals overall when there are no KO results', () => {
    const overall = computeLeaderboard('overall', users, teams, assignments, fixtures);
    const grpOnly = computeLeaderboard('group_only', users, teams, assignments, fixtures);
    expect(grpOnly.map((r) => [r.name, r.points])).toEqual(overall.map((r) => [r.name, r.points]));
  });

  it('ko_only is zero when only group games are finished', () => {
    const ko = computeLeaderboard('ko_only', users, teams, assignments, fixtures);
    expect(ko.every((r) => r.points === 0)).toBe(true);
  });

  it('leftover teams do not contribute to anyone — even if they score 9 goals', () => {
    const extra = [...fixtures, finishedGroup(5, 9, 0, 5, 6)]; // leftover (5) thrashes filler (6)
    const board = computeLeaderboard('overall', users, teams, assignments, extra);
    expect(board.every((r) => r.points === 8)).toBe(true);
  });
});
