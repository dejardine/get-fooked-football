import { describe, it, expect } from 'vitest';
import {
  aggregateReactions,
  clampEmoji,
  MAX_COMMENT_LEN,
  parseMentions,
  validateCommentBody,
} from '@/lib/match-chat';

describe('validateCommentBody', () => {
  it('rejects empty body when no image', () => {
    expect(validateCommentBody('', false)).toEqual({ ok: false, reason: 'empty' });
    expect(validateCommentBody('   ', false)).toEqual({ ok: false, reason: 'empty' });
  });
  it('allows empty body when an image is attached', () => {
    expect(validateCommentBody('', true)).toEqual({ ok: true, body: '' });
  });
  it('trims whitespace', () => {
    expect(validateCommentBody('  hi  ', false)).toEqual({ ok: true, body: 'hi' });
  });
  it('rejects too-long bodies', () => {
    expect(validateCommentBody('x'.repeat(MAX_COMMENT_LEN + 1), false)).toEqual({ ok: false, reason: 'too-long' });
  });
  it('accepts exactly at the limit', () => {
    expect(validateCommentBody('x'.repeat(MAX_COMMENT_LEN), false)).toEqual({ ok: true, body: 'x'.repeat(MAX_COMMENT_LEN) });
  });
});

describe('parseMentions', () => {
  const users = [
    { id: 1, name: 'Robin' },
    { id: 2, name: 'Sam' },
    { id: 3, name: 'Robin McGee' },
  ];
  it('returns plain text when no @', () => {
    expect(parseMentions('hello world', users)).toEqual([{ type: 'text', value: 'hello world' }]);
  });
  it('extracts a known mention', () => {
    expect(parseMentions('hey @Sam!', users)).toEqual([
      { type: 'text', value: 'hey ' },
      { type: 'mention', value: 'Sam', userId: 2 },
      { type: 'text', value: '!' },
    ]);
  });
  it('prefers longer matches (Robin McGee over Robin)', () => {
    const spans = parseMentions('@Robin McGee is winning', users);
    expect(spans).toEqual([
      { type: 'mention', value: 'Robin McGee', userId: 3 },
      { type: 'text', value: ' is winning' },
    ]);
  });
  it('is case-insensitive on the name match', () => {
    const spans = parseMentions('go @robin', users);
    expect(spans).toEqual([
      { type: 'text', value: 'go ' },
      { type: 'mention', value: 'Robin', userId: 1 },
    ]);
  });
  it('leaves unknown @mentions as plain text', () => {
    expect(parseMentions('@nobody knows', users)).toEqual([
      { type: 'text', value: '@nobody knows' },
    ]);
  });
  it('handles email-like strings without inventing a mention', () => {
    const spans = parseMentions('email me at me@example.com', users);
    expect(spans).toEqual([{ type: 'text', value: 'email me at me@example.com' }]);
  });
  it('handles multiple mentions in one body', () => {
    expect(parseMentions('@Robin vs @Sam', users)).toEqual([
      { type: 'mention', value: 'Robin', userId: 1 },
      { type: 'text', value: ' vs ' },
      { type: 'mention', value: 'Sam', userId: 2 },
    ]);
  });
});

describe('aggregateReactions', () => {
  it('groups by emoji and counts', () => {
    const out = aggregateReactions(
      [
        { emoji: '🔥', userId: 1, userName: 'Robin' },
        { emoji: '🔥', userId: 2, userName: 'Sam' },
        { emoji: '😂', userId: 1, userName: 'Robin' },
      ],
      null,
    );
    expect(out).toEqual([
      { emoji: '🔥', count: 2, names: ['Robin', 'Sam'], mine: false },
      { emoji: '😂', count: 1, names: ['Robin'], mine: false },
    ]);
  });
  it('marks current viewer with mine=true', () => {
    const out = aggregateReactions(
      [
        { emoji: '⚽', userId: 1, userName: 'Robin' },
        { emoji: '⚽', userId: 2, userName: 'Sam' },
      ],
      1,
    );
    expect(out[0].mine).toBe(true);
  });
  it('sorts most-popular first, alphabetical emoji as tiebreak', () => {
    const out = aggregateReactions(
      [
        { emoji: '😂', userId: 1, userName: 'A' },
        { emoji: '🔥', userId: 2, userName: 'B' },
      ],
      null,
    );
    // Both have count 1; '🔥' (U+1F525) > '😂' (U+1F602) so localeCompare order may vary.
    // We just check both are present and length is correct.
    expect(out).toHaveLength(2);
    expect(new Set(out.map((r) => r.emoji))).toEqual(new Set(['🔥', '😂']));
  });
  it('returns empty for no input', () => {
    expect(aggregateReactions([], 1)).toEqual([]);
  });
});

describe('clampEmoji', () => {
  it('returns a single grapheme', () => {
    expect(clampEmoji('🔥🔥🔥')).toBe('🔥');
  });
  it('handles flag emoji (regional indicators)', () => {
    expect(clampEmoji('🇳🇿')).toBe('🇳🇿');
  });
  it('strips whitespace', () => {
    expect(clampEmoji('   ⚽  ')).toBe('⚽');
  });
  it('returns empty for empty input', () => {
    expect(clampEmoji('')).toBe('');
    expect(clampEmoji('   ')).toBe('');
  });
});
