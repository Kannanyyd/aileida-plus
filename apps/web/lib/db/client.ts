import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const databaseUrl = process.env.DATABASE_URL ?? "postgres://radar:radar@localhost:5432/ai_price_radar";
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  _db = drizzle(pool);
  return _db;
}

// 懒初始化，避免构建时连接 DB
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
