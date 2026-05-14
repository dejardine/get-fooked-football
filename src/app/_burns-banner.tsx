import { db, schema } from '@/db/client';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { avatarFor } from '@/lib/avatar';
import { displayName } from '@/lib/display-name';
import { formatTimeRemaining } from '@/lib/group-invite';
import { Avatar } from './_avatar';
import { UserLink } from './_user-link';
import { dismissBurnAction } from './_burn-actions';

/** Banner stack at the top of <main>. Renders the 3 most recent active
 *  burns. Only invoked when the viewer is signed-in + onboarded — burns
 *  are gossip among the crew, not marketing copy. */
export async function BurnsBanner({
  viewerUserId,
  viewerIsAdmin,
}: {
  viewerUserId: number;
  viewerIsAdmin: boolean;
}) {
  const now = new Date();
  const rows = await db
    .select({
      id: schema.burns.id,
      body: schema.burns.body,
      expiresAt: schema.burns.expiresAt,
      userId: schema.burns.userId,
      userName: schema.users.name,
      userNickname: schema.users.nickname,
      userEmail: schema.users.email,
      userAvatar: schema.users.avatarUrl,
    })
    .from(schema.burns)
    .leftJoin(schema.users, eq(schema.users.id, schema.burns.userId))
    .where(and(gt(schema.burns.expiresAt, now), isNull(schema.burns.dismissedAt)))
    .orderBy(desc(schema.burns.id))
    .limit(3);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {rows.map((b) => {
        const display = b.userName
          ? displayName({ name: b.userName, nickname: b.userNickname })
          : 'someone';
        const canDismiss = b.userId === viewerUserId || viewerIsAdmin;
        return (
          <div
            key={b.id}
            className="flex items-center gap-3 border-[3px] border-cga-black bg-cga-magenta text-cga-black px-3 py-2 shadow-cga"
          >
            <UserLink userId={b.userId} name={display}>
              <Avatar
                src={avatarFor({ email: b.userEmail ?? '', avatarUrl: b.userAvatar ?? null }, 48)}
                name={display}
                size={24}
              />
            </UserLink>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{b.body}</div>
              <div className="text-xs">
                <UserLink userId={b.userId} name={display} className="font-bold" />
                <span className="opacity-100"> · {formatTimeRemaining(b.expiresAt, now)}</span>
              </div>
            </div>
            {canDismiss && (
              <form action={dismissBurnAction}>
                <input type="hidden" name="burn_id" value={b.id} />
                <button
                  type="submit"
                  className="border-[2px] border-cga-black px-2 py-1 text-xs font-bold uppercase hover:bg-cga-black hover:text-cga-magenta"
                  title="Dismiss"
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
