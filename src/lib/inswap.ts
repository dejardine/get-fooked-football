import { db, schema } from '@/db/client';
import { sql } from 'drizzle-orm';

export type InswapStanding = {
  photoId: number;
  userId: number;
  userName: string;
  caption: string | null;
  filePath: string;
  thumbsUp: number;
  hotOrNotWins: number;
  hotOrNotLosses: number;
};

export async function getInswapStandings(): Promise<InswapStanding[]> {
  const rows = await db.execute(sql`
    select p.id as photo_id, p.user_id, u.name as user_name, p.caption, p.file_path,
           (select count(*)::int from photo_votes v where v.photo_id = p.id) as thumbs_up,
           (select count(*)::int from hot_or_not_votes h where h.winner_photo_id = p.id) as hon_wins,
           (select count(*)::int from hot_or_not_votes h where h.loser_photo_id  = p.id) as hon_losses
    from photos p
    join users u on u.id = p.user_id
    order by p.created_at desc
  `);
  return rows.rows.map((r) => {
    const obj = r as Record<string, unknown>;
    return {
      photoId: Number(obj.photo_id),
      userId: Number(obj.user_id),
      userName: String(obj.user_name),
      caption: (obj.caption as string | null) ?? null,
      filePath: String(obj.file_path),
      thumbsUp: Number(obj.thumbs_up),
      hotOrNotWins: Number(obj.hon_wins),
      hotOrNotLosses: Number(obj.hon_losses),
    };
  });
}

export function sortStandings(rows: InswapStanding[]): InswapStanding[] {
  return rows.slice().sort((a, b) => {
    if (b.thumbsUp !== a.thumbsUp) return b.thumbsUp - a.thumbsUp;
    // Tiebreaker: hot-or-not wins minus losses, then wins.
    const netA = a.hotOrNotWins - a.hotOrNotLosses;
    const netB = b.hotOrNotWins - b.hotOrNotLosses;
    if (netB !== netA) return netB - netA;
    if (b.hotOrNotWins !== a.hotOrNotWins) return b.hotOrNotWins - a.hotOrNotWins;
    return a.userName.localeCompare(b.userName);
  });
}
