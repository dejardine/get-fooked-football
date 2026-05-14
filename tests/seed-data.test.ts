import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  splitCsvRow,
  parseRankings,
  parseFixtures,
  formatBracketLabel,
  stageFromCsv,
  buildTeamSeeds,
  TEAM_META,
} from '@/lib/seed-data';

const FIXTURES_CSV = readFileSync(resolve(__dirname, '../scripts/data/fixtures.csv'), 'utf8');
const RANKINGS_CSV = readFileSync(resolve(__dirname, '../scripts/data/rankings.csv'), 'utf8');

describe('splitCsvRow', () => {
  it('splits a plain row', () => {
    expect(splitCsvRow('a,b,c')).toEqual(['a', 'b', 'c']);
  });
  it('respects quoted fields with embedded commas', () => {
    expect(splitCsvRow('1,"Hong Kong, China",1026.63')).toEqual(['1', 'Hong Kong, China', '1026.63']);
  });
});

describe('stageFromCsv', () => {
  it('maps CSV stage names to schema stage codes', () => {
    expect(stageFromCsv('First Stage')).toBe('GROUP');
    expect(stageFromCsv('Round of 32')).toBe('R32');
    expect(stageFromCsv('Round of 16')).toBe('R16');
    expect(stageFromCsv('Quarter-final')).toBe('QF');
    expect(stageFromCsv('Semi-final')).toBe('SF');
    expect(stageFromCsv('Play-off for third place')).toBe('3RD');
    expect(stageFromCsv('Final')).toBe('FINAL');
  });
  it('throws on unknown stage', () => {
    expect(() => stageFromCsv('Bogus')).toThrow();
  });
});

describe('formatBracketLabel', () => {
  it('formats group placement', () => {
    expect(formatBracketLabel('1A')).toBe('Group A — 1st');
    expect(formatBracketLabel('2B')).toBe('Group B — 2nd');
    expect(formatBracketLabel('3L')).toBe('Group L — 3rd');
  });
  it('formats winner and runner-up references', () => {
    expect(formatBracketLabel('W73')).toBe('Winner M73');
    expect(formatBracketLabel('RU101')).toBe('Loser M101');
  });
  it('formats third-place multi-group placeholders', () => {
    expect(formatBracketLabel('3ABCDF')).toBe('3rd: A/B/C/D/F');
    expect(formatBracketLabel('3CDFGH')).toBe('3rd: C/D/F/G/H');
  });
  it('passes through unknown labels', () => {
    expect(formatBracketLabel('weird')).toBe('weird');
  });
});

describe('parseRankings', () => {
  const rankings = parseRankings(RANKINGS_CSV);
  it('parses 211 nations', () => {
    expect(rankings.size).toBeGreaterThan(200);
  });
  it('has France at #1', () => {
    expect(rankings.get('France')?.rank).toBe(1);
  });
  it('handles quoted country name with comma', () => {
    expect(rankings.get('Hong Kong, China')?.rank).toBe(155);
  });
});

describe('parseFixtures', () => {
  const fixtures = parseFixtures(FIXTURES_CSV);
  it('parses all 104 fixtures', () => {
    expect(fixtures).toHaveLength(104);
  });
  it('first fixture is MEX vs RSA in Group A', () => {
    expect(fixtures[0].homeCode).toBe('MEX');
    expect(fixtures[0].awayCode).toBe('RSA');
    expect(fixtures[0].groupName).toBe('A');
    expect(fixtures[0].stage).toBe('GROUP');
  });
  it('has 72 group fixtures and 32 knockout fixtures', () => {
    expect(fixtures.filter((f) => f.stage === 'GROUP')).toHaveLength(72);
    expect(fixtures.filter((f) => f.stage !== 'GROUP')).toHaveLength(32);
  });
  it('KO fixtures have raw labels rather than codes', () => {
    const r32 = fixtures.find((f) => f.stage === 'R32');
    expect(r32?.homeCode).toBeNull();
    expect(r32?.awayCode).toBeNull();
    expect(r32?.homeRaw).toMatch(/^[123][A-L]$|^3[A-L]{2,}$/);
  });
  it('Final references SF winners', () => {
    const final = fixtures.find((f) => f.stage === 'FINAL');
    expect(final?.homeRaw).toMatch(/^W\d+$/);
    expect(final?.awayRaw).toMatch(/^W\d+$/);
  });
});

describe('buildTeamSeeds', () => {
  const fixtures = parseFixtures(FIXTURES_CSV);
  const rankings = parseRankings(RANKINGS_CSV);
  const seeds = buildTeamSeeds(rankings, fixtures);

  it('yields 48 teams', () => {
    expect(seeds).toHaveLength(48);
  });
  it('assigns each metadata team a group from the fixtures CSV', () => {
    const mex = seeds.find((t) => t.code === 'MEX');
    expect(mex?.groupName).toBe('A');
    const eng = seeds.find((t) => t.code === 'ENG');
    expect(eng?.groupName).toBe('L');
  });
  it('joins FIFA rank from the rankings CSV', () => {
    const fra = seeds.find((t) => t.code === 'FRA');
    expect(fra?.fifaRank).toBe(1);
    const nzl = seeds.find((t) => t.code === 'NZL');
    expect(nzl?.fifaRank).toBe(85);
  });
  it('covers exactly the 48 distinct codes appearing in the group stage', () => {
    const codes = new Set<string>();
    for (const f of fixtures) {
      if (f.homeCode) codes.add(f.homeCode);
      if (f.awayCode) codes.add(f.awayCode);
    }
    expect(codes.size).toBe(48);
    for (const c of codes) {
      expect(TEAM_META.find((t) => t.code === c)).toBeDefined();
    }
  });
});
