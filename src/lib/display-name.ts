/**
 * How a player's name renders across the app. If a nickname is set, we splice
 * it in quoted alongside the real name (`Robin "Sheep Lord"`). Otherwise we
 * just return the real name.
 *
 * Pure — no DB, no React.
 *
 * Anyone can set anyone's nickname at /profile/<id> as a public troll, so
 * keep this helper liberal about whitespace and stray quotes.
 */

export type Nameable = { name: string; nickname?: string | null };

/** Strip any double-quote characters from the nickname so it can't break out
 *  of its rendered quoted form. */
function sanitizeNickname(nickname: string): string {
  return nickname.replace(/["“”]/g, '').trim();
}

export function displayName(user: Nameable): string {
  const real = user.name.trim();
  const nick = user.nickname ? sanitizeNickname(user.nickname) : '';
  if (!nick) return real;
  return `${real} "${nick}"`;
}

/** Just the nickname (sanitized), or null if none. Handy for places where
 *  the nickname stands alone (e.g. compact pills). */
export function nicknameOnly(user: Nameable): string | null {
  if (!user.nickname) return null;
  const nick = sanitizeNickname(user.nickname);
  return nick.length > 0 ? nick : null;
}
