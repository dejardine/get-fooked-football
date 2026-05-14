import { db, schema } from '@/db/client';
import { desc, eq } from 'drizzle-orm';
import { avatarFor } from '@/lib/avatar';
import { displayName } from '@/lib/display-name';
import { fmtNzDateTime } from '@/lib/format';
import { Avatar } from '../_avatar';
import { UserLink } from '../_user-link';

export const dynamic = 'force-dynamic';

/**
 * The full burn archive — active and expired. Read-only nostalgia page.
 * Dismissed burns are filtered out; expired ones (past expires_at) are
 * shown with a faded look so the timeline still reads as a roast tape.
 */
export default async function BurnsArchive() {
  const rows = await db
    .select({
      id: schema.burns.id,
      body: schema.burns.body,
      createdAt: schema.burns.createdAt,
      expiresAt: schema.burns.expiresAt,
      dismissedAt: schema.burns.dismissedAt,
      userId: schema.burns.userId,
      userName: schema.users.name,
      userNickname: schema.users.nickname,
      userEmail: schema.users.email,
      userAvatar: schema.users.avatarUrl,
    })
    .from(schema.burns)
    .leftJoin(schema.users, eq(schema.users.id, schema.burns.userId))
    .orderBy(desc(schema.burns.id))
    .limit(200);

  const now = new Date();
  const visible = rows.filter((b) => b.dismissedAt == null);

  return (
    <div className="space-y-6">
      <div className="brutal-card">
        <h1 className="brutal-h1 brutal-heading-magenta">Burn archive</h1>
        <p className="text-sm mt-2">
          Every burn posted to the sitewide banner. Active ones are full colour; expired ones fade out — historical
          record, not active gossip.
        </p>
      </div>

      <div className="brutal-card">
        {visible.length === 0 ? (
          <p className="opacity-100 text-sm">No burns yet. Be the first to drop one from the homepage.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((b) => {
              const active = b.expiresAt.getTime() > now.getTime();
              const display = b.userName
                ? displayName({ name: b.userName, nickname: b.userNickname })
                : 'someone';
              return (
                <li
                  key={b.id}
                  className={`flex items-center gap-3 border-[3px] border-current px-3 py-2 ${
                    active ? '' : 'opacity-50'
                  }`}
                >
                  <UserLink userId={b.userId} name={display}>
                    <Avatar
                      src={avatarFor({ email: b.userEmail ?? '', avatarUrl: b.userAvatar ?? null }, 48)}
                      name={display}
                      size={24}
                    />
                  </UserLink>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold break-words">{b.body}</div>
                    <div className="text-xs opacity-100">
                      <UserLink userId={b.userId} name={display} className="font-bold" />
                      <span> · {fmtNzDateTime(b.createdAt)}</span>
                      <span> · {active ? 'active' : 'expired'}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
