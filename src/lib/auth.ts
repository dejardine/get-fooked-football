import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, schema } from '@/db/client';
import { eq, sql } from 'drizzle-orm';

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function generateInviteToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = lower(${email})`)
    .limit(1);
  return rows[0];
}

export async function findInvite(token: string) {
  const rows = await db.select().from(schema.invites).where(eq(schema.invites.token, token)).limit(1);
  return rows[0];
}

export async function bootstrapAdminIfNeeded() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const pw = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !pw) return;
  const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (existing.length > 0) return;
  const passwordHash = await hashPassword(pw);
  await db.insert(schema.users).values({
    email,
    name: 'Admin',
    passwordHash,
    isAdmin: true,
    paid: true,
  });
  // Drop a starter invite the admin can hand out.
  await db.insert(schema.invites).values({ token: generateInviteToken(), note: 'starter invite' });
  console.log(`[auth] Bootstrapped admin ${email}`);
}
