# AI 订阅雷达 — 项目记忆

## 项目定位
- AI 模型价格雷达网站（ModelPrice Radar）
- 深色科技数据看板风格：`#070B18` 主背景，`#4F7CFF` 品牌色，`#22C55E`（降）/`#EF4444`（涨）
- 不许展示无来源价格；每条数据必有 source_url/snapshot/confidence/need_manual_review

## 技术栈
- Next.js 15 App Router (TS) + Tailwind + Recharts + Drizzle ORM + PostgreSQL 16
- Worker: Playwright + cheerio + undici（抓取层独立进程）
- 共享包: @pricing/core（TS 计算引擎，fork genai-prices 概念）
- monorepo: npm workspaces（apps/web, apps/worker, packages/pricing-core）

## 关键文件
- `apps/web/lib/db/schema.ts` — Drizzle 表定义（与 worker 共享字段约定）
- `apps/web/lib/db/queries.ts` — 所有 DB 查询
- `apps/web/lib/rank/score.ts` — 性价比评分（7 种榜单预设权重）
- `apps/worker/src/sources/` — 4 国际 + 9 国内数据源
- `apps/worker/src/diff/pricing-diff.ts` — 差异引擎
- `apps/worker/src/sources/cn-registry.ts` — 9 家国内厂商 URL 配置
- `scripts/migrate.ts` / `scripts/seed.ts` — 迁移与种子

## 部署
- 本地开发: `docker compose up -d postgres adminer` → `npm run db:migrate` → `npm run db:seed` → `npm run dev`
- 抓取: `npm run scrape:all`
- Adminer: http://localhost:8080

## 数据完整性规则
- 新模型 + 高置信度(≥0.8) + 单源 → 自动更新
- 多源冲突(差异 >10%) 或 低置信度(<0.6) → 进 review_queue
- 字段缺失/类型异常 → 进 review_queue(reason=schema-anomaly)
- 禁止低置信度覆盖高置信度
- 禁止自动合并冲突价格
