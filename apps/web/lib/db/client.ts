import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://radar:radar@localhost:5432/ai_price_radar";

const { Pool } = pg;

const globalForDb = globalThis as unknown as { __pgPool?: pg.Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
  });

if (!globalForDb.__pgPool) globalForDb.__pgPool = pool;

export const db = drizzle(pool);
