/**
 * Pure helpers that translate the source-of-truth CSVs in `scripts/data/`
 * into shapes the DB seed can consume.
 *
 * Kept free of `fs`/Drizzle so the parsers can be unit-tested directly.
 */

export type Stage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL';

export type Ranking = { rank: number; points: number };

export type ParsedFixture = {
  /** 1-indexed match number in fixture order (CSV row order). */
  matchNo: number;
  kickoff: Date;
  stage: Stage;
  groupName: string | null;
  /** Three-letter code if a real team, otherwise null and `homeLabel` is set. */
  homeCode: string | null;
  awayCode: string | null;
  /** Raw bracket placeholder (e.g. "2A", "W73", "RU101") for KO rows. */
  homeRaw: string;
  awayRaw: string;
  venue: string;
  city: string;
};

export type TeamMeta = {
  code: string;
  name: string;
  /** Country name as it appears in `rankings.csv`, used to look up FIFA rank. */
  rankingsName: string;
  flag: string;
  population: number;
  sheep: number;
};

const STAGE_BY_CSV: Record<string, Stage> = {
  'First Stage': 'GROUP',
  'Round of 32': 'R32',
  'Round of 16': 'R16',
  'Quarter-final': 'QF',
  'Semi-final': 'SF',
  'Play-off for third place': '3RD',
  Final: 'FINAL',
};

export function stageFromCsv(stage: string): Stage {
  const s = STAGE_BY_CSV[stage];
  if (!s) throw new Error(`Unknown stage label: ${stage}`);
  return s;
}

/**
 * Minimal CSV row parser handling double-quoted fields with embedded commas
 * (e.g. "Hong Kong, China" in the FIFA rankings).
 */
export function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseRankings(csv: string): Map<string, Ranking> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out = new Map<string, Ranking>();
  // First line is the header.
  for (let i = 1; i < lines.length; i++) {
    const [rankStr, name, pointsStr] = splitCsvRow(lines[i]);
    if (!name) continue;
    out.set(name, { rank: Number(rankStr), points: Number(pointsStr) });
  }
  return out;
}

const REAL_TEAM_CODE = /^[A-Z]{3}$/;

export function parseFixtures(csv: string): ParsedFixture[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: ParsedFixture[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [iso, stage, group, home, away, venue, city] = splitCsvRow(lines[i]);
    const homeReal = REAL_TEAM_CODE.test(home);
    const awayReal = REAL_TEAM_CODE.test(away);
    out.push({
      matchNo: i,
      kickoff: new Date(iso),
      stage: stageFromCsv(stage),
      groupName: group.startsWith('Group ') ? group.slice('Group '.length) : null,
      homeCode: homeReal ? home : null,
      awayCode: awayReal ? away : null,
      homeRaw: home,
      awayRaw: away,
      venue,
      city,
    });
  }
  return out;
}

/**
 * Renders raw bracket placeholders ("2A", "W73", "RU101", "3CDFGH") into
 * the friendlier strings we store in `fixtures.home_label` / `away_label`.
 */
export function formatBracketLabel(raw: string): string {
  // "W73" -> Winner of match 73
  let m = raw.match(/^W(\d+)$/);
  if (m) return `Winner M${m[1]}`;
  // "RU101" -> Loser (runner-up) of match 101
  m = raw.match(/^RU(\d+)$/);
  if (m) return `Loser M${m[1]}`;
  // "2A" or "1C" -> "Group A — 2nd"
  m = raw.match(/^([123])([A-L])$/);
  if (m) {
    const place = m[1] === '1' ? '1st' : m[1] === '2' ? '2nd' : '3rd';
    return `Group ${m[2]} — ${place}`;
  }
  // "3ABCDF" -> 3rd-place from A/B/C/D/F
  m = raw.match(/^3([A-L]{2,})$/);
  if (m) return `3rd: ${m[1].split('').join('/')}`;
  return raw;
}

/**
 * Curated metadata for the 48 teams in the 2026 World Cup draw.
 * Population (rounded UN-ish estimates) and sheep (FAOSTAT-ish, rounded);
 * admin can edit these in the UI.
 */
export const TEAM_META: ReadonlyArray<TeamMeta> = [
  // Group A
  { code: 'MEX', name: 'Mexico', rankingsName: 'Mexico', flag: '🇲🇽', population: 129_000_000, sheep: 8_700_000 },
  { code: 'RSA', name: 'South Africa', rankingsName: 'South Africa', flag: '🇿🇦', population: 61_400_000, sheep: 21_000_000 },
  { code: 'KOR', name: 'Korea Republic', rankingsName: 'Korea Republic', flag: '🇰🇷', population: 51_700_000, sheep: 0 },
  { code: 'CZE', name: 'Czechia', rankingsName: 'Czechia', flag: '🇨🇿', population: 10_700_000, sheep: 240_000 },
  // Group B
  { code: 'CAN', name: 'Canada', rankingsName: 'Canada', flag: '🇨🇦', population: 40_100_000, sheep: 825_000 },
  { code: 'BIH', name: 'Bosnia and Herzegovina', rankingsName: 'Bosnia and Herzegovina', flag: '🇧🇦', population: 3_200_000, sheep: 1_000_000 },
  { code: 'QAT', name: 'Qatar', rankingsName: 'Qatar', flag: '🇶🇦', population: 2_700_000, sheep: 250_000 },
  { code: 'SUI', name: 'Switzerland', rankingsName: 'Switzerland', flag: '🇨🇭', population: 8_800_000, sheep: 350_000 },
  // Group C
  { code: 'BRA', name: 'Brazil', rankingsName: 'Brazil', flag: '🇧🇷', population: 216_400_000, sheep: 17_100_000 },
  { code: 'MAR', name: 'Morocco', rankingsName: 'Morocco', flag: '🇲🇦', population: 37_700_000, sheep: 21_800_000 },
  { code: 'HAI', name: 'Haiti', rankingsName: 'Haiti', flag: '🇭🇹', population: 11_700_000, sheep: 0 },
  { code: 'SCO', name: 'Scotland', rankingsName: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', population: 5_500_000, sheep: 6_700_000 },
  // Group D
  { code: 'USA', name: 'United States', rankingsName: 'USA', flag: '🇺🇸', population: 334_900_000, sheep: 5_000_000 },
  { code: 'PAR', name: 'Paraguay', rankingsName: 'Paraguay', flag: '🇵🇾', population: 6_800_000, sheep: 360_000 },
  { code: 'AUS', name: 'Australia', rankingsName: 'Australia', flag: '🇦🇺', population: 26_400_000, sheep: 70_500_000 },
  { code: 'TUR', name: 'Türkiye', rankingsName: 'Türkiye', flag: '🇹🇷', population: 85_300_000, sheep: 44_700_000 },
  // Group E
  { code: 'GER', name: 'Germany', rankingsName: 'Germany', flag: '🇩🇪', population: 83_300_000, sheep: 1_500_000 },
  { code: 'CUW', name: 'Curaçao', rankingsName: 'Curaçao', flag: '🇨🇼', population: 155_000, sheep: 5_000 },
  { code: 'CIV', name: "Côte d'Ivoire", rankingsName: "Côte d'Ivoire", flag: '🇨🇮', population: 28_200_000, sheep: 2_500_000 },
  { code: 'ECU', name: 'Ecuador', rankingsName: 'Ecuador', flag: '🇪🇨', population: 17_900_000, sheep: 1_100_000 },
  // Group F
  { code: 'NED', name: 'Netherlands', rankingsName: 'Netherlands', flag: '🇳🇱', population: 17_600_000, sheep: 800_000 },
  { code: 'JPN', name: 'Japan', rankingsName: 'Japan', flag: '🇯🇵', population: 124_500_000, sheep: 12_000 },
  { code: 'SWE', name: 'Sweden', rankingsName: 'Sweden', flag: '🇸🇪', population: 10_500_000, sheep: 600_000 },
  { code: 'TUN', name: 'Tunisia', rankingsName: 'Tunisia', flag: '🇹🇳', population: 12_500_000, sheep: 6_900_000 },
  // Group G
  { code: 'BEL', name: 'Belgium', rankingsName: 'Belgium', flag: '🇧🇪', population: 11_700_000, sheep: 138_000 },
  { code: 'EGY', name: 'Egypt', rankingsName: 'Egypt', flag: '🇪🇬', population: 112_700_000, sheep: 5_500_000 },
  { code: 'IRN', name: 'Iran', rankingsName: 'IR Iran', flag: '🇮🇷', population: 88_500_000, sheep: 41_300_000 },
  { code: 'NZL', name: 'New Zealand', rankingsName: 'New Zealand', flag: '🇳🇿', population: 5_200_000, sheep: 25_300_000 },
  // Group H
  { code: 'ESP', name: 'Spain', rankingsName: 'Spain', flag: '🇪🇸', population: 48_400_000, sheep: 14_100_000 },
  { code: 'CPV', name: 'Cabo Verde', rankingsName: 'Cabo Verde', flag: '🇨🇻', population: 540_000, sheep: 10_000 },
  { code: 'KSA', name: 'Saudi Arabia', rankingsName: 'Saudi Arabia', flag: '🇸🇦', population: 36_400_000, sheep: 18_000_000 },
  { code: 'URU', name: 'Uruguay', rankingsName: 'Uruguay', flag: '🇺🇾', population: 3_400_000, sheep: 6_600_000 },
  // Group I
  { code: 'FRA', name: 'France', rankingsName: 'France', flag: '🇫🇷', population: 68_300_000, sheep: 6_800_000 },
  { code: 'SEN', name: 'Senegal', rankingsName: 'Senegal', flag: '🇸🇳', population: 17_900_000, sheep: 7_800_000 },
  { code: 'IRQ', name: 'Iraq', rankingsName: 'Iraq', flag: '🇮🇶', population: 45_500_000, sheep: 9_100_000 },
  { code: 'NOR', name: 'Norway', rankingsName: 'Norway', flag: '🇳🇴', population: 5_500_000, sheep: 2_400_000 },
  // Group J
  { code: 'ARG', name: 'Argentina', rankingsName: 'Argentina', flag: '🇦🇷', population: 45_800_000, sheep: 14_400_000 },
  { code: 'ALG', name: 'Algeria', rankingsName: 'Algeria', flag: '🇩🇿', population: 45_400_000, sheep: 28_400_000 },
  { code: 'AUT', name: 'Austria', rankingsName: 'Austria', flag: '🇦🇹', population: 9_100_000, sheep: 360_000 },
  { code: 'JOR', name: 'Jordan', rankingsName: 'Jordan', flag: '🇯🇴', population: 11_300_000, sheep: 3_300_000 },
  // Group K
  { code: 'POR', name: 'Portugal', rankingsName: 'Portugal', flag: '🇵🇹', population: 10_300_000, sheep: 1_900_000 },
  { code: 'COD', name: 'DR Congo', rankingsName: 'Congo DR', flag: '🇨🇩', population: 102_300_000, sheep: 1_100_000 },
  { code: 'UZB', name: 'Uzbekistan', rankingsName: 'Uzbekistan', flag: '🇺🇿', population: 35_300_000, sheep: 18_400_000 },
  { code: 'COL', name: 'Colombia', rankingsName: 'Colombia', flag: '🇨🇴', population: 52_100_000, sheep: 1_700_000 },
  // Group L
  { code: 'ENG', name: 'England', rankingsName: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', population: 57_100_000, sheep: 22_800_000 },
  { code: 'CRO', name: 'Croatia', rankingsName: 'Croatia', flag: '🇭🇷', population: 3_900_000, sheep: 700_000 },
  { code: 'GHA', name: 'Ghana', rankingsName: 'Ghana', flag: '🇬🇭', population: 34_100_000, sheep: 4_700_000 },
  { code: 'PAN', name: 'Panama', rankingsName: 'Panama', flag: '🇵🇦', population: 4_500_000, sheep: 0 },
];

export type TeamSeed = TeamMeta & { fifaRank: number; groupName: string };

/** Build the 48-team seed: metadata + FIFA rank + group from the fixtures CSV. */
export function buildTeamSeeds(rankings: Map<string, Ranking>, fixtures: ParsedFixture[]): TeamSeed[] {
  const groupByCode = new Map<string, string>();
  for (const f of fixtures) {
    if (f.stage !== 'GROUP' || !f.groupName) continue;
    if (f.homeCode) groupByCode.set(f.homeCode, f.groupName);
    if (f.awayCode) groupByCode.set(f.awayCode, f.groupName);
  }
  return TEAM_META.map((t) => {
    const r = rankings.get(t.rankingsName);
    const group = groupByCode.get(t.code);
    if (!group) throw new Error(`Team ${t.code} has no group in fixtures`);
    return { ...t, fifaRank: r?.rank ?? 999, groupName: group };
  });
}
