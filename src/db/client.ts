import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { __pgPool?: Pool };

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/get_fooked';

// Railway-style URLs need SSL; bare local ones don't.
const needsSsl = /sslmode=require|railway\.app|render\.com|amazonaws\.com/i.test(connectionString);

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
