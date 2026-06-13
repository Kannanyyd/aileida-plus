import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

const globalForDb = globalThis as unknown as { __pgPool?: pg.Pool };

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: config.databaseUrl,
    max: 10,
  });

if (!globalForDb.__pgPool) globalForDb.__pgPool = pool;

export const db = drizzle(pool);
