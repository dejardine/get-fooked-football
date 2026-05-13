import { describe, it, expect } from 'vitest';
import { mulberry32, planDraw } from '@/lib/draw';

describe('planDraw', () => {
  const teams = Array.from({ length: 48 }, (_, i) => i + 1);
  const users = Array.from({ length: 7 }, (_, i) => i + 1);

  it('hands every assigned team to exactly one user', () => {
    const { assignments } = planDraw(teams, users, mulberry32(1));
    const owned = new Map<number, number>();
    for (const a of assignments) {
      if (a.userId == null) continue;
      expect(owned.has(a.teamId)).toBe(false); // no duplicate ownership
      owned.set(a.teamId, a.userId);
    }
    expect(owned.size).toBe(42); // floor(48/7)*7 = 42
  });

  it('places exactly the remainder in the leftover pool', () => {
    const { assignments, leftover, teamsPerUser } = planDraw(teams, users, mulberry32(1));
    expect(teamsPerUser).toBe(6);
    expect(leftover).toBe(48 - 6 * 7);
    expect(assignments.filter((a) => a.isLeftover).length).toBe(leftover);
    for (const a of assignments) {
      if (a.isLeftover) expect(a.userId).toBeNull();
    }
  });

  it('distributes teams evenly across users', () => {
    const { assignments } = planDraw(teams, users, mulberry32(7));
    const counts = new Map<number, number>();
    for (const a of assignments) {
      if (a.userId == null) continue;
      counts.set(a.userId, (counts.get(a.userId) ?? 0) + 1);
    }
    expect(Array.from(counts.values())).toEqual(Array(users.length).fill(6));
  });

  it('is reproducible given the same seed', () => {
    const a = planDraw(teams, users, mulberry32(42)).assignments;
    const b = planDraw(teams, users, mulberry32(42)).assignments;
    expect(a).toEqual(b);
  });

  it('produces a different draw for a different seed', () => {
    const a = planDraw(teams, users, mulberry32(1)).assignments;
    const b = planDraw(teams, users, mulberry32(2)).assignments;
    expect(a).not.toEqual(b);
  });

  it('throws if there are no users', () => {
    expect(() => planDraw(teams, [], mulberry32(1))).toThrow(/users/);
  });

  it('handles 1 user gets all teams, 0 leftover', () => {
    const { assignments, leftover, teamsPerUser } = planDraw(teams, [1], mulberry32(3));
    expect(teamsPerUser).toBe(48);
    expect(leftover).toBe(0);
    expect(assignments.every((a) => a.userId === 1)).toBe(true);
  });

  it('handles users > teams (each user gets 0, all teams in leftover)', () => {
    const { assignments, leftover, teamsPerUser } = planDraw([1, 2, 3], [1, 2, 3, 4, 5], mulberry32(9));
    expect(teamsPerUser).toBe(0);
    expect(leftover).toBe(3);
    expect(assignments.every((a) => a.isLeftover)).toBe(true);
  });
});
