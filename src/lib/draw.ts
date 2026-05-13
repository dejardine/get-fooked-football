import { db, schema } from '@/db/client';

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type PlannedAssignment = { teamId: number; userId: number | null; isLeftover: boolean };

/**
 * Pure function: takes two arrays of ids and produces the assignment plan.
 * No DB. Stable, deterministic given the same rng. Exported so it can be tested in isolation.
 */
export function planDraw(
  teamIds: number[],
  userIds: number[],
  rng: () => number = Math.random,
): { assignments: PlannedAssignment[]; teamsPerUser: number; leftover: number } {
  if (userIds.length === 0) throw new Error('No users registered yet.');
  if (teamIds.length === 0) throw new Error('No teams seeded yet.');
  const shuffledTeams = shuffle(teamIds, rng);
  const shuffledUsers = shuffle(userIds, rng);
  const teamsPerUser = Math.floor(teamIds.length / userIds.length);
  const totalAssignable = teamsPerUser * userIds.length;
  const assignments: PlannedAssignment[] = [];
  for (let i = 0; i < totalAssignable; i++) {
    assignments.push({ teamId: shuffledTeams[i], userId: shuffledUsers[i % shuffledUsers.length], isLeftover: false });
  }
  for (let i = totalAssignable; i < shuffledTeams.length; i++) {
    assignments.push({ teamId: shuffledTeams[i], userId: null, isLeftover: true });
  }
  return { assignments, teamsPerUser, leftover: shuffledTeams.length - totalAssignable };
}

/**
 * Deterministic PRNG — exported for tests so a seed yields a reproducible draw.
 */
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * DB-aware draw: pulls users + teams, runs the plan, writes assignments.
 * Replaces any existing assignments.
 */
export async function runRandomDraw(seed?: number) {
  const users = await db.select().from(schema.users);
  const teams = await db.select().from(schema.teams);
  const rng = seed != null ? mulberry32(seed) : Math.random;
  const plan = planDraw(
    teams.map((t) => t.id),
    users.map((u) => u.id),
    rng,
  );
  await db.transaction(async (tx) => {
    await tx.delete(schema.teamAssignments);
    if (plan.assignments.length > 0) {
      await tx.insert(schema.teamAssignments).values(plan.assignments);
    }
  });
  return { users: users.length, teams: teams.length, teamsPerUser: plan.teamsPerUser, leftover: plan.leftover };
}
