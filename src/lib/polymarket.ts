/**
 * Polymarket data layer for the "2026 FIFA World Cup Winner" event.
 *
 * Uses Polymarket's public Gamma API + CLOB price-history endpoint. No auth required for reads.
 * Cached briefly on the server so the page can be rendered without thrashing their API.
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const CLOB_BASE = 'https://clob.polymarket.com';

// Override via env var if Polymarket renames the event slug.
export const EVENT_SLUG = process.env.POLYMARKET_EVENT_SLUG || 'fifa-world-cup-2026-winner';

export type PolyOutcome = {
  /** Team name as Polymarket lists it ("France", "Spain", …) */
  name: string;
  /** Outcome image URL (usually a flag) */
  image?: string;
  /** Yes price in dollars (0..1). 0.18 → 18% probability. */
  yesPrice: number;
  /** No price in dollars (0..1). Usually 1 - yesPrice ± spread. */
  noPrice: number;
  /** USD volume on this sub-market */
  volume: number;
  /** Token id used to query the CLOB price-history endpoint */
  yesTokenId?: string;
  /** Single-market slug, useful for deep-linking back to Polymarket */
  slug: string;
};

export type PolyEvent = {
  title: string;
  slug: string;
  totalVolume: number;
  endDate: string | null;
  outcomes: PolyOutcome[];
};

export type PriceSeries = {
  outcomeName: string;
  /** ms-epoch */
  t: number[];
  /** 0..1 */
  p: number[];
};

const CACHE_TTL_MS = 60_000;
let cache: { fetchedAt: number; event: PolyEvent } | null = null;
let seriesCache: { fetchedAt: number; series: PriceSeries[] } | null = null;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    // Next.js: cache server-side for 60 seconds.
    next: { revalidate: 60 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Polymarket ${res.status} ${res.statusText} fetching ${url}`);
  }
  return res.json() as Promise<T>;
}

// Some Gamma fields are JSON-encoded strings; tolerate either shape.
function maybeParseJson<T>(v: unknown): T | null {
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }
  return (v as T) ?? null;
}

type RawMarket = {
  id: string;
  slug: string;
  question?: string;
  groupItemTitle?: string;
  image?: string;
  icon?: string;
  outcomePrices?: string | string[];
  clobTokenIds?: string | string[];
  volume?: number | string;
  volumeNum?: number;
};

type RawEvent = {
  title: string;
  slug: string;
  endDate?: string | null;
  volume?: number | string;
  volumeNum?: number;
  markets?: RawMarket[];
};

export async function fetchEvent(force = false): Promise<PolyEvent> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.event;
  }
  const events = await getJson<RawEvent[]>(`${GAMMA_BASE}/events?slug=${encodeURIComponent(EVENT_SLUG)}`);
  if (!events?.length) {
    throw new Error(`No Polymarket event found for slug "${EVENT_SLUG}". Set POLYMARKET_EVENT_SLUG to the correct one.`);
  }
  const raw = events[0];
  const outcomes: PolyOutcome[] = (raw.markets ?? [])
    .map((m) => {
      const prices = maybeParseJson<string[]>(m.outcomePrices) ?? [];
      const tokens = maybeParseJson<string[]>(m.clobTokenIds) ?? [];
      const yes = Number(prices[0] ?? 0);
      const no = Number(prices[1] ?? Math.max(0, 1 - yes));
      const vol = Number(m.volumeNum ?? m.volume ?? 0);
      return {
        name: m.groupItemTitle ?? m.question ?? m.slug,
        image: m.icon ?? m.image,
        yesPrice: yes,
        noPrice: no,
        volume: vol,
        yesTokenId: tokens[0],
        slug: m.slug,
      };
    })
    .sort((a, b) => b.yesPrice - a.yesPrice);

  const event: PolyEvent = {
    title: raw.title,
    slug: raw.slug,
    totalVolume: Number(raw.volumeNum ?? raw.volume ?? 0),
    endDate: raw.endDate ?? null,
    outcomes,
  };
  cache = { fetchedAt: Date.now(), event };
  return event;
}

export async function fetchPriceHistory(outcomes: PolyOutcome[], topN = 4): Promise<PriceSeries[]> {
  if (seriesCache && Date.now() - seriesCache.fetchedAt < CACHE_TTL_MS) {
    return seriesCache.series;
  }
  const top = outcomes.slice(0, topN);
  const results = await Promise.all(
    top.map(async (o) => {
      if (!o.yesTokenId) return { outcomeName: o.name, t: [], p: [] } as PriceSeries;
      try {
        const r = await getJson<{ history: { t: number; p: number }[] }>(
          `${CLOB_BASE}/prices-history?market=${o.yesTokenId}&interval=max&fidelity=720`,
        );
        return {
          outcomeName: o.name,
          t: r.history.map((h) => h.t * 1000),
          p: r.history.map((h) => h.p),
        };
      } catch {
        return { outcomeName: o.name, t: [], p: [] };
      }
    }),
  );
  seriesCache = { fetchedAt: Date.now(), series: results };
  return results;
}
