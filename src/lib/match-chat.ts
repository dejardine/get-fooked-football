/**
 * Pure helpers for the match-page chat (comments + emoji reactions).
 * No DB, no React — easy to unit test.
 */

export const MAX_COMMENT_LEN = 2000;
export const MAX_EMOJI_LEN = 8; // a flag emoji can be 7 code units; allow some headroom
export const MENTION_REGEX = /(^|[^A-Za-z0-9_])@([A-Za-z][A-Za-z0-9 _-]{0,30}?)(?=$|[.,!?;:\s])/g;

export type CommentValidation =
  | { ok: true; body: string }
  | { ok: false; reason: 'empty' | 'too-long' };

/** Trim body, enforce length. Empty body is allowed if and only if an image is attached. */
export function validateCommentBody(raw: unknown, hasImage: boolean): CommentValidation {
  const body = typeof raw === 'string' ? raw.trim() : '';
  if (body.length === 0 && !hasImage) return { ok: false, reason: 'empty' };
  if (body.length > MAX_COMMENT_LEN) return { ok: false, reason: 'too-long' };
  return { ok: true, body };
}

export type MentionSpan = { type: 'text'; value: string } | { type: 'mention'; value: string; userId: number };

/**
 * Split a comment body into spans, marking @-mentions that resolve to a known
 * display name. Unknown @-mentions fall back to text. Case-insensitive match;
 * names are tried longest-first so "@Robin McGee" beats "@Robin".
 */
export function parseMentions(
  body: string,
  users: ReadonlyArray<{ id: number; name: string }>,
): MentionSpan[] {
  // Sort by length desc so longer names get matched first when nested.
  const sorted = [...users].sort((a, b) => b.name.length - a.name.length);
  const spans: MentionSpan[] = [];
  let i = 0;
  while (i < body.length) {
    const at = body.indexOf('@', i);
    if (at === -1) {
      if (i < body.length) spans.push({ type: 'text', value: body.slice(i) });
      break;
    }
    if (at > i) spans.push({ type: 'text', value: body.slice(i, at) });
    // Try to match the longest known name beginning right after '@'.
    let matched: { id: number; name: string } | null = null;
    for (const u of sorted) {
      const slice = body.slice(at + 1, at + 1 + u.name.length);
      if (slice.toLowerCase() === u.name.toLowerCase()) {
        // Make sure the character after the name is a word-boundary so
        // "@RobinM" doesn't accidentally match "@Robin".
        const next = body[at + 1 + u.name.length];
        if (!next || /[\s.,!?;:)\]}]/.test(next)) {
          matched = u;
          break;
        }
      }
    }
    if (matched) {
      spans.push({ type: 'mention', value: matched.name, userId: matched.id });
      i = at + 1 + matched.name.length;
    } else {
      spans.push({ type: 'text', value: '@' });
      i = at + 1;
    }
  }
  // Coalesce adjacent text spans for cleaner React keys downstream.
  return mergeText(spans);
}

function mergeText(spans: MentionSpan[]): MentionSpan[] {
  const out: MentionSpan[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (s.type === 'text' && last && last.type === 'text') {
      out[out.length - 1] = { type: 'text', value: last.value + s.value };
    } else {
      out.push(s);
    }
  }
  return out;
}

export type ReactionRow = { emoji: string; userId: number; userName: string };
export type ReactionAggregate = {
  emoji: string;
  count: number;
  /** Names of users who reacted with this emoji, oldest-first by row order. */
  names: string[];
  /** Whether the current viewer is in `names`. */
  mine: boolean;
};

/**
 * Group reactions by emoji and produce a stable display order (most popular
 * first, then alphabetical by emoji as a tiebreaker).
 */
export function aggregateReactions(
  rows: ReadonlyArray<ReactionRow>,
  currentUserId: number | null,
): ReactionAggregate[] {
  const map = new Map<string, ReactionAggregate>();
  for (const r of rows) {
    let agg = map.get(r.emoji);
    if (!agg) {
      agg = { emoji: r.emoji, count: 0, names: [], mine: false };
      map.set(r.emoji, agg);
    }
    agg.count += 1;
    agg.names.push(r.userName);
    if (currentUserId != null && r.userId === currentUserId) agg.mine = true;
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}

/** Cap an emoji input to a single grapheme so people can't shove a sentence in. */
export function clampEmoji(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  try {
    const segmenter = new Intl.Segmenter();
    const first = segmenter.segment(trimmed)[Symbol.iterator]().next().value;
    if (first && typeof first.segment === 'string') return first.segment.slice(0, MAX_EMOJI_LEN);
  } catch {
    /* fall through */
  }
  return trimmed.slice(0, MAX_EMOJI_LEN);
}
