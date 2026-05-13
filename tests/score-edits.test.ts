import { describe, it, expect } from 'vitest';
import { validateScoreEdit } from '@/lib/score-edits';

describe('validateScoreEdit', () => {
  it('rejects negative scores', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: -1, awayScore: 0, status: 'FINISHED' })).toThrow(/negative/i);
  });

  it('rejects non-integer scores', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: 1.5, awayScore: 0, status: 'FINISHED' })).toThrow(/integer/i);
  });

  it('rejects implausibly large scores', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: 99, awayScore: 0, status: 'FINISHED' })).toThrow(/plausible/i);
  });

  it('requires scores when status is FINISHED', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: null, awayScore: null, status: 'FINISHED' })).toThrow(/score/i);
  });

  it('accepts a valid group-stage result', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: 3, awayScore: 2, status: 'FINISHED' })).not.toThrow();
  });

  it('requires penalty scores when a KO match is drawn after ET', () => {
    expect(() =>
      validateScoreEdit({ stage: 'QF', homeScore: 1, awayScore: 1, homeScoreEt: 2, awayScoreEt: 2, homePens: null, awayPens: null, status: 'FINISHED' }),
    ).toThrow(/penalt/i);
  });

  it('does not require pens if a KO match is decided in 90 mins', () => {
    expect(() =>
      validateScoreEdit({ stage: 'R16', homeScore: 2, awayScore: 1, status: 'FINISHED' }),
    ).not.toThrow();
  });

  it('allows status SCHEDULED with empty scores', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: null, awayScore: null, status: 'SCHEDULED' })).not.toThrow();
  });

  it('rejects an unknown status', () => {
    expect(() => validateScoreEdit({ stage: 'GROUP', homeScore: 0, awayScore: 0, status: 'WIBBLE' as never })).toThrow(/status/i);
  });
});
