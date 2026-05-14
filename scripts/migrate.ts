/**
 * Apply any pending Drizzle migrations against the connected DATABASE_URL.
 *
 * - Idempotent: re-running on an up-to-date DB is a no-op.
 * - Non-interactive: no "yes/no" prompts. Safe for CI / Railway pre-deploy.
 * - First-run bootstrap: if the DB already has the current schema but no
 *   drizzle migration journal (because we used to push instead of migrate),
 *   we create the journal and mark the baseline migration as applied so the
 *   first call doesn't try to CREATE TABLE on already-existing tables.
 *
 * Usage:
 *   npm run db:migrate        # apply any pending migrations
 *   npm run db:bootstrap      # one-off: mark baseline as applied (only needed once on legacy DBs)
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '../src/db/client';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle');

async function bootstrapIfNeeded() {
  const client = await pool.connect();
  try {
    // Does the drizzle migrations journal already exist?
    const r = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations') AS exists`,
    );
    if (r.rows[0]?.exists) return;

    // Journal doesn't exist. Two cases:
    //   (a) the DB is brand new -> the upcoming `migrate()` call will create
    //       the journal and run every migration. No bootstrap needed.
    //   (b) the DB already has app tables (legacy push'd DB) -> running every
    //       migration would explode with "relation already exists". So we
    //       detect a legacy DB by looking for a known table and, if found,
    //       create the journal and mark baseline as applied.
    const legacy = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') AS exists`,
    );
    if (!legacy.rows[0]?.exists) return;

    console.log('Legacy DB detected (has app tables, no drizzle journal). Bootstrapping…');
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    // Hash the baseline migration the same way drizzle does (SHA256 hex of
    // the file content) and record it as applied.
    const baseline = path.join(MIGRATIONS_DIR, '0000_baseline.sql');
    const sql = await fs.readFile(baseline, 'utf8');
    const hash = crypto.createHash('sha256').update(sql).digest('hex');
    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, Date.now()],
    );
    console.log(`  marked 0000_baseline as applied (hash ${hash.slice(0, 12)}…)`);
  } finally {
    client.release();
  }
}

async function main() {
  await bootstrapIfNeeded();
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  console.log('Migrations up to date.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
