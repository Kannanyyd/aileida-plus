import "dotenv/config";

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://radar:radar@localhost:5432/ai_price_radar",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  adminUser: process.env.ADMIN_USER ?? "admin",
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
  fx: {
    usdCny: Number(process.env.USD_CNY_RATE ?? "7.18"),
  },
};
