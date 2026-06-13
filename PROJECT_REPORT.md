# AI 模型价格雷达项目详细说明文档

> PROJECT_REPORT.md — 项目验收、功能盘点与后续优化参考
>
> 生成时间：2026-06-13 | 版本：v0.1-MVP
>
> **当前状态：MVP 阶段，核心数据链路可用，5 个前台页面使用 mock 数据占位，尚未接入真实数据库查询。**

---

## 1. 项目概述

### 基本信息

| 项 | 内容 |
|---|---|
| 项目名称 | AI 模型价格雷达（ModelPrice Radar） |
| 项目定位 | AI 模型领域的"行情站 + 成本计算器 + 优惠情报站 + 选型助手" |
| 目标用户 | 国内 AI 开发者、创业者、内容团队、企业技术选型人员 |
| 当前版本 | v0.1-MVP（可本地运行预览，未部署上线） |
| 完成程度 | 核心架构完成，数据链路打通（抓取→入库→展示），部分页面为 mock 占位 |

### 项目不是普通 AI 导航站

本项目区别于普通 AI 工具导航站的五个核心能力：

1. **AI 模型价格雷达** — 自动监控国内外模型 API 价格变化，展示历史趋势
2. **AI 模型成本计算器** — 根据使用量（tokens/图片/音频）计算月成本
3. **AI 模型选型助手** — 输入场景/预算/技术要求，输出可解释的三档推荐
4. **AI 厂商数据库** — 每厂商标注公司背景、产品线、计费特征、适合用户
5. **AI 优惠与新闻动态监控** — 自动抓取官方公告和价格变化，区分新模型/价格/优惠/政策

---

## 2. 技术栈说明

### 已实现并使用

| 层 | 技术 | 版本/备注 |
|---|---|---|
| 前端框架 | Next.js 15 (App Router, TypeScript) | Server Components + Client Components 混合 |
| 样式 | Tailwind CSS + 自定义深色科技风 CSS 变量 | `--bg-main: #070B18` 等，见 `globals.css` |
| UI 组件 | 自建组件 + Lucide Icons | 16 个组件（model-card, promotion-card, review-* 等） |
| 图表 | Recharts | 雷达图（CapabilityRadar）、价格趋势图（PriceTrendChart） |
| ORM | Drizzle ORM + node-postgres (pg) | 类型安全，双份 schema（web + worker 各自维护） |
| 数据库 | PostgreSQL 16（docker-compose 本地） | 19 张表，含 JSONB 字段存储快照和标签 |
| 抓取 | undici（轻量 HTTP）+ Playwright（无头浏览器） | 5 个 source adapter，全部走真实网络请求 |
| HTML 解析 | cheerio | `extractTables` / `simplifyHtml` |
| 定时任务 | node-cron（worker 进程内） | 默认每小时全量抓取 |
| 价格计算 | 自建 TypeScript 包 `@pricing/core` | fork 自 pydantic/genai-prices 概念，13 个测试用例 |
| 部署方式 | 本地 docker-compose（Postgres + Adminer） | 未配置 Vercel/自托管部署 |
| 包管理 | npm workspaces（原设计为 pnpm，sandbox 环境改用 npm） | 3 个 workspace：web, worker, pricing-core |
| 环境变量管理 | `.env.example`（22 行） + 各包私有 `.env` | 含 DB 连接、上游源 URL、LLM fallback、USD/CNY 汇率 |

### 计划但未实现

| 技术 | 状态 |
|---|---|
| shadcn/ui 组件库 | **未引入**。全部使用自建组件 |
| framer-motion 动画 | **未引入**。页面无过渡动效 |
| LLM 结构化解析 (`apps/worker/src/llm/`) | **目录不存在**。HTML 解析仅用 cheerio 启发式规则，未实现 LLM 兜底 |
| BullMQ / Redis 任务队列 | **未引入**。worker 使用内存 node-cron |
| Vercel / Docker 部署配置 | **未实现**。无 `Dockerfile`、`vercel.json` 等 |

---

## 3. 项目目录结构说明

```
ai-price-radar/                          # 项目根（D:\Agent\自动化\AI订阅雷达）
├── README.md                            # 简要说明
├── PROJECT_REPORT.md                    # 本文件：详细项目文档
├── package.json                         # npm workspaces 根配置
├── docker-compose.yml                   # Postgres 16 + Adminer (localhost:8080)
├── .env.example                         # 环境变量模板（22 行）
│
├── packages/
│   └── pricing-core/                    # ★ 价格计算 & 推荐评分引擎
│       ├── src/
│       │   ├── schema/                  # Zod schema（provider, model, pricing, promotion）
│       │   ├── calculator/              # 核心计算
│       │   │   ├── token-cost.ts        #   token 成本计算
│       │   │   ├── tiered-pricing.ts    #   阶梯计费
│       │   │   ├── cache-pricing.ts     #   缓存定价
│       │   │   ├── scenarios.ts         #   场景预设
│       │   │   ├── estimate.ts          #   综合估算
│       │   │   └── recommend.ts         # ★ 推荐评分算法（多目标排序 + 三档方案）
│       │   ├── registry/                # 模型注册表 + 索引
│       │   └── index.ts                 # 顶层 calculator.estimate / calculator.rank
│       └── tests/
│           ├── calculator.test.ts       # 6 个测试
│           └── recommend.test.ts        # 7 个测试
│
├── apps/
│   ├── web/                             # ★ Next.js 15 前台 + 后台
│   │   ├── app/
│   │   │   ├── page.tsx                 # 首页（Hero + 今日动态 + 排行榜 + 优惠 + 免责声明）
│   │   │   ├── models/                  # 模型库 + 模型详情 + 更新日志
│   │   │   ├── providers/               # 厂商一览 + 厂商详情 + 厂商动态
│   │   │   ├── calculator/              # 价格计算器
│   │   │   ├── recommend/               # AI 模型推荐助手（5 步向导）
│   │   │   ├── rankings/                # 排行榜（7 类）
│   │   │   ├── promotions/              # 优惠聚合
│   │   │   ├── compare/                 # 双模型对比（SEO 程序化）
│   │   │   ├── ai-news/                 # 每日 AI 动态
│   │   │   ├── plans/                   # 会员/Plan 对比
│   │   │   ├── admin/                   # ★ 后台管理
│   │   │   │   ├── page.tsx             #   概览
│   │   │   │   ├── review/              #   数据复核台
│   │   │   │   ├── reviews/             #   用户点评审核
│   │   │   │   ├── providers/           #   厂商管理
│   │   │   │   ├── sources/             #   抓取源管理
│   │   │   │   └── changelog/           #   价格变更历史
│   │   │   └── api/v1/                  # ★ REST API（8 个端点）
│   │   ├── components/                  # 16 个 UI 组件
│   │   ├── lib/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts            # ★ Drizzle schema（19 张表，Web 端）
│   │   │   │   ├── queries.ts           # ★ 复用查询（listModels, getModelBySlug, ...）
│   │   │   │   └── client.ts            # Drizzle + pg Pool 客户端
│   │   │   ├── rank/                    # 性价比评分算法
│   │   │   │   ├── score.ts             #   加权评分（5 维）
│   │   │   │   └── weights.ts           #   7 种榜单预设权重
│   │   │   ├── utils.ts                 # formatCny, formatUsd, formatContext
│   │   │   ├── news-constants.ts        # 新闻分类标签
│   │   │   └── review-filter.ts         # 评论合规过滤
│   │   ├── scripts/
│   │   │   ├── migrate.ts               # ★ SQL 迁移（19 张表完整 DDL）
│   │   │   └── seed.ts                  # 种子数据（12 provider + 1 汇率）
│   │   └── globals.css                  # 深色科技风 CSS 变量
│   │
│   └── worker/                          # ★ 抓取 Worker
│       ├── src/
│       │   ├── index.ts                 # 进程入口（cron 调度）
│       │   ├── pipeline.ts              # ★ 数据管线（抓取→标准化→入库）
│       │   ├── config.ts                # Worker 配置
│       │   ├── types.ts                 # NormalizedModel/Pricing/Promotion 类型
│       │   ├── sources/
│       │   │   ├── openrouter.ts        #   OpenRouter API → undici fetch
│       │   │   ├── litellm.ts           #   LiteLLM JSON → undici fetch
│       │   │   ├── llm-prices.ts        #   simonw/llm-prices (current + historical)
│       │   │   ├── genai-prices.ts      #   pydantic/genai-prices → undici fetch
│       │   │   ├── cn-provider.ts       # ★ 国内厂商 Playwright 抓取
│       │   │   ├── cn-registry.ts       #   国内厂商 URL 配置（9 家种子，可扩展）
│       │   │   └── news-registry.ts     #   新闻源注册表（25+ 源配置）
│       │   ├── fetchers/
│       │   │   ├── http.ts              #   fetchJson / fetchText (undici)
│       │   │   └── html.ts              #   fetchHtml (Playwright + Chromium)
│       │   ├── parsers/
│       │   │   └── html-table.ts        #   extractTables (cheerio) / simplifyHtml
│       │   ├── normalizer/
│       │   │   └── currency.ts          #   toUsdPer1M 货币转换
│       │   ├── diff/
│       │   │   └── pricing-diff.ts      # ★ diff 引擎（自动/冲突/新模型分流）
│       │   └── storage/
│       │       ├── schema.ts            #   Drizzle schema（Worker 端，与 Web 一致）
│       │       ├── client.ts            #   DB 客户端
│       │       ├── provider-store.ts    #   upsertProvider
│       │       ├── model-store.ts       #   upsertModel, findModelByExternalId
│       │       └── pricing-store.ts     #   upsertPricing（含 diff + review_queue）
│       └── tsconfig.json
```

### 关键路径速查

| 要找什么 | 在哪里 |
|---|---|
| 页面代码 | `apps/web/app/**/page.tsx`（21 个路由） |
| 数据库 schema | `apps/web/lib/db/schema.ts` + `apps/worker/src/storage/schema.ts`（双份一致） |
| 抓取逻辑 | `apps/worker/src/sources/*.ts`（5 个 adapter） |
| 抓取 pipeline | `apps/worker/src/pipeline.ts` |
| 推荐算法 | `packages/pricing-core/src/calculator/recommend.ts` |
| 价格计算 | `packages/pricing-core/src/calculator/` |
| 性价比评分 | `apps/web/lib/rank/score.ts` |
| 后台管理 | `apps/web/app/admin/**/page.tsx`（6 个页面） |
| 数据源配置 | `apps/worker/src/sources/cn-registry.ts` + `apps/worker/src/sources/news-registry.ts` |
| 迁移 SQL | `apps/web/scripts/migrate.ts`（19 张表 DDL） |

---

## 4. 已实现页面清单

| # | 路由 | 作用 | 数据来源 | 筛选/搜索 | 状态 |
|---|---|---|---|---|---|
| 1 | `/` | 首页 | Server Component + DB queries | Hero 搜索框 | ✅ 真数据（有 DB 则真，无 DB 则空） |
| 2 | `/models` | 模型库 | DB queries (listModels + listProviders) | 按厂商筛选 | ✅ 真数据 |
| 3 | `/models/[slug]` | 模型详情 | DB queries (getModelBySlug) + modelStrengths | — | ✅ 真数据；点评表单为 Client Component |
| 4 | `/models/[slug]/changelog` | 模型更新日志 | **硬编码** MOCK_CHANGELOGS（仅 3 个模型） | — | ⚠ Mock |
| 5 | `/providers` | 厂商一览 | DB queries (listProviders) | 按 category 分组 | ✅ 真数据 |
| 6 | `/providers/[slug]` | 厂商详情档案 | DB queries (getProviderBySlug + listModels + subscriptionPlans + promotions) | — | ✅ 真数据 |
| 7 | `/providers/[slug]/news` | 厂商动态 | **硬编码** PROVIDER_NEWS（仅 4 个厂商） | — | ⚠ Mock |
| 8 | `/calculator` | 价格计算器 | Client Component + listModels (DB) | 场景选择 + token 输入 | ✅ 真数据驱动（计算结果为实时） |
| 9 | `/recommend` | 模型推荐助手 | **硬编码** planModels 数组（6 个模型样例） | 5 步向导 | ⚠ Mock（结果数据硬编码） |
| 10 | `/rankings` | 性价比总榜 | DB queries (listModels + rank score) | — | ✅ 真数据 |
| 11 | `/rankings/[type]` | 分类榜（写作/编程/长文本/最便宜/多模态/免费额度） | DB queries | — | ✅ 真数据 |
| 12 | `/promotions` | 优惠聚合 | DB queries (listActivePromotions) | — | ✅ 真数据（有 DB 则真） |
| 13 | `/compare/[pair]` | 双模型对比 | DB queries (直连 models+pricing+providers) | — | ✅ 真数据 |
| 14 | `/ai-news` | 每日 AI 动态 | **硬编码** MOCK_NEWS（10 条） | 10 种分类标签筛选 | ⚠ Mock |
| 15 | `/plans` | 会员/Plan 对比 | **硬编码** MOCK_PLANS（5 家厂商） | — | ⚠ Mock |
| 16 | `/admin` | 后台概览 | 纯展示（导航入口） | — | ✅ 展示页面 |
| 17 | `/admin/review` | 数据复核台 | DB queries (reviewQueue) | — | ✅ 真数据 |
| 18 | `/admin/reviews` | 用户点评审核 | DB queries (userReviews + models + providers) | — | ✅ 真数据 |
| 19 | `/admin/providers` | 厂商管理 | DB queries (providers) | — | ✅ 真数据 |
| 20 | `/admin/sources` | 抓取源管理 | DB queries (scraperJobs) | — | ✅ 真数据 |
| 21 | `/admin/changelog` | 价格变更历史 | DB queries (priceChangeLog + models + providers) | — | ✅ 真数据 |

### 汇总

- **真实数据页面**：16 个（依赖 DB 连接，有数据则真）
- **Mock 数据页面**：5 个（/ai-news、/plans、/models/[slug]/changelog、/providers/[slug]/news、/recommend 的结果数据）

---

## 5. 数据库设计说明

### 5.1 表清单（19 张）

| # | 表名 | 作用 | 主要字段数 | 有索引 | 有唯一约束 | 支持来源追踪 |
|---|---|---|---|---|---|---|
| 1 | `providers` | 厂商档案 | 45+ | ✅ region/category/active | ✅ slug | ✅ data_source_urls, last_verified_at |
| 2 | `models` | 模型 | 11 | ✅ provider_id | ✅ slug | — |
| 3 | `pricing` | API 价格（当前生效，每模型 1 行） | 19 | ✅ confidence/review | ✅ model_id (UNIQUE) | ✅ source_url (NOT NULL, CHECK > 0) |
| 4 | `price_change_log` | 价格变更历史 | 9 | ✅ model/field/detected | — | ✅ source_url (NOT NULL) |
| 5 | `promotions` | 优惠活动 | 15 | ✅ provider/type/active | — | ✅ source_url (NOT NULL) |
| 6 | `review_queue` | 人工复核队列 | 10 | ✅ entity/reason/status | — | — |
| 7 | `source_snapshots` | 原始抓取快照 | 10 | ✅ source/hash | — | — |
| 8 | `scraper_jobs` | 抓取任务状态 | 9 | ✅ source/status | — | — |
| 9 | `fx_rates` | 汇率（简化版） | 6 | — | — | — |
| 10 | `model_strengths` | 模型擅长方向标签 | 6 | ✅ model_id | ✅ (model_id, slug) | — |
| 11 | `user_reviews` | 用户点评（10 维评分） | 25 | ✅ model/approved/flagged | — | — |
| 12 | `news_sources` | 新闻数据源注册 | 11 | ✅ type/region/active | ✅ slug | — |
| 13 | `news_events` | 新闻事件聚合 | 12 | ✅ category/published | — | — |
| 14 | `news_items` | 单条新闻动态 | 20 | ✅ source/event/category/published/fetched | ✅ (source_id, external_id) | ✅ confidence_score, need_manual_review |
| 15 | `daily_digests` | 每日摘要 | 7 | — | ✅ date (UNIQUE) | — |
| 16 | `product_offerings` | 产品/计费形态 | 14 | ✅ provider/type | — | ✅ source_url (NOT NULL) |
| 17 | `subscription_plans` | 会员方案 | 15 | ✅ provider/tier | — | ✅ source_url (NOT NULL) |
| 18 | `exchange_rate_snapshots` | 汇率快照（增强版） | 7 | ✅ (base, quote) | — | — |
| 19 | `source_fetch_logs` | 抓取日志 | 9 | ✅ source/status | — | — |

### 5.2 关联关系

```
providers 1───n models 1───1 pricing
              │              └── n price_change_log
              ├── n model_strengths
              ├── n user_reviews
              ├── n product_offerings
              ├── n subscription_plans
              └── n promotions
news_sources 1───n news_items ──n───1 news_events
pricing/promotions/news_items ──need_manual_review──→ review_queue
```

### 5.3 核心设计原则

- **可追溯**：所有价格/优惠/计费记录强制 NOT NULL `source_url`，pricing 表有 CHECK 约束
- **可回放**：`source_snapshots` 存完整原始内容 + SHA256 hash
- **可审核**：`review_queue` 统一管理冲突/低置信度/异常数据
- **不自动覆盖**：diff 引擎分流 → 高置信度单源自动更新；多源冲突/低置信度进入 review_queue

### 5.4 缺失的关键表

以下表在 schema 中**已定义**，迁移 SQL 已包含，但 **worker storage 层无专用 upsert 函数**，当前无法通过抓取 pipeline 写入：

| 表 | 写入方式 | 状态 |
|---|---|---|
| `source_snapshots` | 需要 pipeline 中持久化 raw 数据 | 未接入 |
| `source_fetch_logs` | 需要每次抓取后写入 | 未接入 |
| `news_sources` / `news_items` / `news_events` / `daily_digests` | 需要新闻 pipeline | 未实现 |
| `product_offerings` / `subscription_plans` | 可通过 Web API 手动录入 | storage 函数未实现 |

---

## 6. 厂商数据源设计说明

### 6.1 是否可扩展：✅ 是

| 问题 | 答案 |
|---|---|
| 是否写死了厂商数量？ | **否**。providers 表无数量限制，seed 数据含 12 家仅是最小引导 |
| 是否存在"9 家厂商"硬编码？ | **已全部清除**。代码、文档、注释中均无该表述 |
| 是否支持后台新增厂商？ | ✅ `admin/providers` 页面支持查看管理，但"新增"按钮功能待完善 |
| 是否支持后台新增数据源 URL？ | ✅ providers 表含 12 个 URL 字段（pricing/docs/blog/changelog/github...） |
| 每个厂商是否支持多个数据源？ | ✅ `news_sources` 表支持配置任意数量源（每家可配价格页+文档+公告+博客+RSS） |
| 新增厂商是否需要改代码？ | **不需要**。通过 DB 插入 + news_sources 注册即可，无需修改 worker 代码 |
| 是否有 source registry？ | ✅ `cn-registry.ts`（9 家种子）+ `news-registry.ts`（25+ 源配置）均在代码中 |
| 是否有新厂商发现机制？ | ⚠ **规划但未实现**。admin/providers 页面有 UI 说明（"系统定期搜索新厂商"），但无实际发现任务 |

### 6.2 架构说明

当前架构支持无限扩展厂商：
```
providers 表（DB，无限量）
  └── news_sources 表（每个 provider 可配多个源）
       └── worker 抓取（按 schedule 定时运行）
```

`cn-registry.ts` 中的 9 家配置仅作为种子数据参考，不是上限。后续新增厂商只需：
1. 在 `providers` 表插入记录
2. 在 `news_sources` 表配置抓取 URL
3. Worker 自动按 schedule 抓取

---

## 7. 抓取系统说明

### 7.1 实现状态

| 能力 | 状态 | 说明 |
|---|---|---|
| Playwright 无头浏览器 | ✅ | `html.ts` 使用 `chromium.launch({ headless: true })` |
| 轻量 HTTP 抓取 | ✅ | `http.ts` 使用 undici fetchJson/fetchText |
| 优先 API/JSON 源 | ✅ | 4 个国际源走 undici，国内走 Playwright |
| 定时任务 | ✅ | node-cron，默认 `0 * * * *`（每小时），可配置 |
| 失败重试 | ⚠ | **未实现**。无指数退避、无重试计数 |
| 保存原始快照 | ❌ | `source_snapshots` 表存在但 pipeline 未写入 |
| 记录 source_url | ✅ | 所有 pricing/promotions 强制 NOT NULL |
| 记录 fetched_at | ✅ | 各表含 `fetched_at` / `created_at` 字段 |
| diff 检测 | ✅ | `diffPricing` 支持 same/changed/conflict/new 四种结果 |
| 价格变化检测 | ✅ | 发现变化时自动写入 `price_change_log` |
| 新模型发现 | ✅ | diff 返回 `new` 时自动 upsert |
| 优惠发现 | ✅ | pipeline.ts 新增 `ingestPromotions` |
| 人工复核 | ✅ | 冲突/低置信度/字段异常 → `review_queue` |

### 7.2 已实现抓取器

| 抓取器 | 数据源 | 抓取方式 | 输出表 | 稳定性 |
|---|---|---|---|---|
| `openrouter.ts` | https://openrouter.ai/api/v1/models | undici fetch JSON | models + pricing | 稳定（公开 API） |
| `litellm.ts` | https://raw.githubusercontent.com/.../model_prices_and_context_window.json | undici fetch JSON | models + pricing | 稳定（GitHub raw） |
| `llm-prices.ts` | https://raw.githubusercontent.com/simonw/llm-prices/main/current-v1.json (+ historical) | undici fetch JSON | models + pricing | 稳定 |
| `genai-prices.ts` | https://raw.githubusercontent.com/pydantic/genai-prices/main/prices/data.json | undici fetch JSON | models + pricing | 稳定 |
| `cn-provider.ts` | 9 家国内厂商价格页/文档页 | Playwright + cheerio 启发式表格提取 | models + pricing + promotions | 中等（依赖页面结构稳定） |

### 7.3 未实现的抓取能力

| 缺失项 | 影响 |
|---|---|
| 新闻源实际抓取（`news-registry.ts` 25+ 源） | 仅配置，无抓取代码。`/ai-news` 页面因此使用 mock 数据 |
| LLM 结构化抽取 | `apps/worker/src/llm/` 目录不存在。cn-provider 遇到非表格结构的价格页会失败 |
| 历史价格数据入库 | llm-prices historical 数据被 fetch 但仅 log 行数，未写入 `price_change_log` |
| 源快照持久化 | 每次抓取的 raw 数据未保存到 `source_snapshots` |

---

## 8. 价格体系说明

### 8.1 价格分类实现

| 价格类型 | 存储表 | 与 API token 价格分离 | 状态 |
|---|---|---|---|
| API 模型 token 计费 | `pricing`（input/output/1M usd） | ✅ 独立表，UNIQUE model_id | ✅ |
| Chat 会员订阅 | `subscription_plans`（monthly/annual price） | ✅ 独立表，不混排 | ⚠ 数据未接入 |
| Team/Enterprise Plan | `product_offerings` | ✅ offering_type 区分 | ⚠ 数据未接入 |
| 充值包/点数包 | `product_offerings`（offering_type='credit-pack'） | ✅ 独立 | ⚠ 数据未接入 |
| 企业询价 | `product_offerings`（price_amount = NULL） | ✅ | ⚠ 数据未接入 |
| 开源部署成本 | 无专用表 | ❌ | 待设计 |

### 8.2 币种显示规则

| 规则 | 实现 |
|---|---|
| 国内厂商价格主显示人民币 | ✅ formatCny() 函数，`¥/1M tokens` |
| 海外 API 价格主显示美元 | ✅ formatUsd() 函数，`$/1M tokens` |
| 保留官方原始币种 | ✅ `currency_native` 字段 |
| 人民币估算 | ✅ 按 fx_rates 汇率（默认 7.18）乘以 usd 值 |
| 汇率更新时间 | ✅ `fx_rates.as_of` + `exchange_rate_snapshots.as_of` |
| 会员/Plan 不进入 token 排行榜 | ✅ 两张独立表，ranking score 仅计算 pricing 表 |
| Plan 页面有独立对比 | ✅ `/plans` 页面（当前 mock 数据） |

---

## 9. 价格计算器说明

### 文件位置
- 页面：`apps/web/app/calculator/page.tsx`
- 计算引擎：`packages/pricing-core/src/calculator/estimate.ts`

### 支持的输入

| 输入项 | 状态 |
|---|---|
| 月输入 tokens | ✅ 数字输入 |
| 月输出 tokens | ✅ 数字输入 |
| 图片数量 | ✅ 支持（$0.002/图 估算） |
| 音频分钟数 | ⚠ 未实现 |
| 视频数量 | ⚠ 未实现 |
| 使用缓存 | ✅ toggle（缓存命中率 50%） |
| 批量调用 | ✅ toggle |
| 人民币/美元展示 | ✅ 同时展示 |
| 会员/Plan 对比 | ❌ 计算器仅适用于 API token 计费 |

### 公式准确性

计算公式在 `packages/pricing-core` 中，覆盖：
- 基础 token 成本（input × 量 + output × 量）
- 缓存折扣（cachedReadUsd × 缓存命中比例 + 非缓存比例 × inputUsd）
- 批量折扣（batch_discount 系数）
- 阶梯计费（tiered_rules 支持）

**13 个测试用例覆盖全部场景。**

⚠ 注意：计算器的模型下拉列表来自 `listModels()` 真实查询，但 **推荐方案 A/B/C** 的数据为按 score 排序后的 DB 结果，非 mock。

---

## 10. 模型推荐助手说明

### 文件位置
- 页面：`apps/web/app/recommend/page.tsx`
- 算法：`packages/pricing-core/src/calculator/recommend.ts`
- API：`apps/web/app/api/v1/recommend/route.ts`

### 用户输入项（已实现）

| 类别 | 选项 | 状态 |
|---|---|---|
| 使用场景 | 写作/编程/客服/知识库/长文档/图片/视频/语音/TTS/数据分析/Agent/翻译/教育 | ✅ 13 种 |
| 使用强度 | 低频(测试)/中频(每日)/高频(大量)/企业级 + 月 tokens 输入 | ✅ |
| 预算偏好 | 尽量便宜/性价比优先/效果优先/稳定优先/国内付款优先/免费额度优先 | ✅ 6 种 |
| 技术要求 | API/国内可访问/国内付款/函数调用/JSON/长上下文/图片/私有化/开源/低延迟/高并发 | ✅ 11 项（多选） |
| 质量要求 | 普通/中文表达/推理/代码/稳定格式/多模态/企业稳定 | ✅ 7 种 |

### 推荐算法

```
recommend_score = 场景匹配分×0.30 + 价格匹配分×0.20 + 能力匹配分×0.20
  + 稳定性分×0.10 + 用户点评分×0.10 + 技术要求匹配分×0.05 + 优惠匹配分×0.05
```

不同场景权重可调（如编程场景代码能力权重 30%，客服场景价格权重 25%）。

### 输出

| 方案 | 说明 | 状态 |
|---|---|---|
| A：低成本优先 | 按月成本最低排序 | ✅ |
| B：综合性价比优先 | 按综合评分排序 | ✅ |
| C：效果/稳定性优先 | 按能力+稳定性加权 | ✅ |
| 推荐理由 | 自动生成 | ✅ |
| 注意事项 | 自动生成 | ✅ |
| 替代模型 | 推荐其他候选 | ✅ |

⚠ **当前缺陷**：`/recommend` 页面的结果数据使用硬编码 `planModels` 数组（6 个示例模型），未实际调用 `/api/v1/recommend` API。API 路由已实现，需将页面 `getResults()` 函数改为 `fetch('/api/v1/recommend', ...)`。

---

## 11. 厂商档案说明

### 文件位置
- 页面：`apps/web/app/providers/[slug]/page.tsx`
- Schema：`providers` 表（45+ 字段）

### 每个厂商档案包含内容

| 模块 | 数据来源 | 状态 |
|---|---|---|
| 中文名 / 英文名 / 品牌名 | providers.name_zh / name_en / brand_name | ✅ |
| 所属公司 / 母公司 | legal_name / parent_company | ✅ |
| 官网 / API 文档 / 价格页 / GitHub | 12 个 URL 字段 | ✅ |
| 背景介绍（长文） | long_description | ⚠ 数据未填充 |
| 一句话简介 | short_description | ⚠ 数据未填充 |
| 主要产品 / 模型 | main_products / main_models | ⚠ 数据未填充 |
| 擅长方向标签 | strengths (JSONB) | ⚠ 数据未填充 |
| 适合用户标签 | suitable_users (JSONB) | ⚠ 数据未填充 |
| 计费特点 | billing_features + 自动推断 | ⚠ 数据未填充 |
| 国内付款 / 发票 | supports_domestic_payment / supports_invoice | ✅ |
| 数据来源链接 | data_source_urls | ⚠ 数据未填充 |
| 更新时间 / 可信度 | last_verified_at / profile_confidence_score | ✅ |

⚠ 关键：providers 表的 45+ 字段在 schema 和迁移 SQL 中已完整定义，但 **seed 数据仅含基本字段**（slug/name_zh/region/homepage/docs_url/api_base_url）。厂商档案的丰富程度取决于后续数据填充。

---

## 12. 用户点评系统说明

### 实现状态：✅ 已实现（前端 + API + 审核，数据需 DB 连接）

### 点评字段

| 字段 | 说明 |
|---|---|
| user_id | 用户标识（当前为 anonymous） |
| usage_scenario | 使用场景（13 种可选） |
| usage_intensity | 使用强度（低/中/高/企业级） |
| 评分 10 维 | 价格/中文/代码/推理/速度/稳定性/API易用/文档/付款/综合 |
| pros / cons | 文字优缺点 |
| suitable_for / not_suitable_for | 标签数组 |
| verified_use | 是否真实使用过 |
| is_approved / is_flagged | 审核状态 |

### 实现文件

| 模块 | 文件 |
|---|---|
| 点评表单 | `components/review-form.tsx`（10 维星级评分） |
| 点评卡片 | `components/review-card.tsx` |
| 点评区域 | `components/review-section.tsx`（筛选 + 排序 + 免责声明） |
| 合规过滤 | `lib/review-filter.ts`（关键词+正则检测攻击性内容） |
| API 提交 | `app/api/v1/reviews/route.ts`（POST 提交 + 自动过滤） |
| 后台审核 | `app/admin/reviews/page.tsx` |

---

## 13. 每日 AI 动态说明

### 实现状态：⚠ 仅前端页面（mock 数据），新闻 pipeline 未实现

| 能力 | 状态 |
|---|---|
| 新闻数据源配置 | ✅ `news-registry.ts`（25+ 源，含国内厂商/科技媒体/海外/政策/GitHub） |
| RSS/API 抓取 | ❌ 未实现（仅配置，无 fetcher 代码） |
| 新闻去重 | ❌ 未实现 |
| AI 摘要 | ❌ 未实现 |
| 事件分类 | ✅ 10 种分类标签已定义 |
| 关联厂商/模型/价格 | ✅ `news_items` 表含 related_provider_ids / related_model_ids |
| 保存来源链接 | ✅ `news_items.url` 字段 |
| 避免全文转载 | ✅ 设计为仅展示标题+摘要+来源链接 |
| 页面展示 | ✅ `/ai-news` 页面可用，但数据为 10 条硬编码示例 |

---

## 14. 人工复核机制说明

### 实现状态：✅ 核心机制已实现

| 检查项 | 状态 |
|---|---|
| 价格冲突 → 复核 | ✅ `diffPricing` 返回 `conflict` → `review_queue` |
| 低置信度 → 复核 | ✅ confidence_score < 0.6 → `review_queue` |
| 新闻争议 → 复核 | ⚠ news_items 有 need_manual_review 字段，但 pipeline 未实现 |
| 用户点评 → 复核 | ✅ `review-filter.ts` 自动标记 → is_flagged=true |
| 自动数据不会覆盖旧数据 | ✅ 仅在 `diff.target='changed' && confidence>=0.8 && 非冲突` 时自动更新 |
| 保存历史 | ✅ `price_change_log` 记录每次变更 |
| review_queue 表 | ✅ 存在且有索引 |
| 后台复核页面 | ✅ `/admin/review`（数据复核）+ `/admin/reviews`（点评审核） |

### 价格覆盖风险：✅ 低风险

diff 引擎在 `apps/worker/src/diff/pricing-diff.ts` 中实现了完整的自动/冲突分流逻辑：
1. 新模型：自动插入但标记 need_manual_review
2. 价格相同：跳过
3. 价格变化 + 高置信度(≥0.8) + 单源：自动更新 + 写 change_log
4. 多源冲突或低置信度(<0.6)：进入 review_queue，**绝不自动覆盖**

pricing 表有 `source_url` 的 CHECK 约束（`length(source_url) > 0`），从数据库层面防止无来源数据。

---

## 15. 合规与免责声明说明

| 声明项 | 状态 | 位置 |
|---|---|---|
| 数据来源说明 | ✅ | 每个价格带 source_url；详情页展示主来源和可信度 |
| 价格以官方为准 | ✅ | SiteDisclaimer 组件（`components/model-strengths.tsx`） |
| 用户点评免责声明 | ✅ | `components/review-card.tsx`（ReviewDisclaimer） |
| 推荐结果仅供参考 | ✅ | `/recommend` 页面底部 |
| 不隶属于相关厂商 | ✅ | SiteDisclaimer 组件 |
| 不全文转载新闻 | ✅ | `/ai-news` 设计为标题+摘要+来源链接 |
| 推广/邀请链接说明 | ❌ | 未实现（无商业化功能） |
| 赞助内容标识 | ❌ | 未实现 |

---

## 16. 商业化功能说明

### 当前状态：❌ 全部未实现

| 功能 | 状态 |
|---|---|
| 邀请链接/推广链接 | ❌ |
| sponsored/nofollow 属性 | ❌ |
| 点击统计 | ❌ |
| 赞助位 | ❌ |
| Pro 会员 | ❌ |
| 团队版 | ❌ |
| 数据 API（外部付费） | ❌（内部 `/api/v1/*` 仅供本站使用） |
| 导出报告 | ❌ |
| 价格提醒 | ❌ |
| 优惠提醒 | ❌ |

---

## 17. Mock 数据与真实数据清单

### 真实数据（抓取自上游数据源）

| 数据 | 来源 | 存储表 |
|---|---|---|
| 国际模型列表 + API 价格 | LiteLLM JSON | models + pricing |
| 国际模型列表 + 聚合价格 | OpenRouter API | models + pricing |
| 模型价格 + 历史 | llm-prices current/historical JSON | models + pricing（historical 仅 log，未入库） |
| 模型注册表数据 | genai-prices JSON | models + pricing |
| 国内厂商模型 + 价格（Playwright） | 9 家官方价格/文档页 | models + pricing + promotions |

### 种子数据（手动录入）

| 数据 | 位置 | 内容 |
|---|---|---|
| 12 家 provider 基本信息 | `apps/web/scripts/seed.ts` | slug, name_zh, region, homepage, docs_url, api_base_url |
| 1 条汇率 | seed.ts | USD/CNY = 7.18 |

### Mock / 硬编码数据

| 数据 | 位置 | 详情 |
|---|---|---|
| `/ai-news` 10 条动态 | `app/ai-news/page.tsx` | MOCK_NEWS 数组 |
| `/plans` 5 家厂商套餐 | `app/plans/page.tsx` | MOCK_PLANS 数组 |
| `/models/[slug]/changelog` 3 个模型日志 | `app/models/[slug]/changelog/page.tsx` | MOCK_CHANGELOGS 字典 |
| `/providers/[slug]/news` 4 个厂商动态 | `app/providers/[slug]/news/page.tsx` | PROVIDER_NEWS 字典 |
| `/recommend` 6 个模型推荐结果 | `app/recommend/page.tsx` | planModels 硬编码数组 |

### UI 占位（无数据）

| 位置 | 说明 |
|---|---|
| `PriceTrendChart` 组件 | 详情页展示空图表，提示"历史数据由 llm-prices 补充" |
| 厂商详情页 long_description / strengths / main_products | 字段定义完整但 seed 数据未填充 |

---

## 18. 当前项目存在的问题

### P0：必须立即修复

| # | 问题 | 影响 | 位置 |
|---|---|---|---|
| P0-1 | `/recommend` 结果使用硬编码数据 | 推荐助手不可用 | `app/recommend/page.tsx` getResults() |
| P0-2 | 新闻 pipeline 完全未实现 | `/ai-news` 页面无法展示真实动态 | worker 缺少 news fetcher |
| P0-3 | 厂商详情页丰富字段（long_description/strengths/main_products）无数据 | 厂商档案空洞 | providers 表 seed 数据不足 |

### P1：上线前需要修复

| # | 问题 | 影响 |
|---|---|---|
| P1-1 | 5 个页面使用硬编码 mock 数据 | 前台展示不真实 |
| P1-2 | llm-prices historical 数据 fetch 后仅 log | 价格趋势图无历史数据 |
| P1-3 | Worker 无失败重试机制 | 抓取失败无自动恢复 |
| P1-4 | 源快照未持久化到 source_snapshots | 无法回溯原始数据 |
| P1-5 | source_fetch_logs 未写入 | 后台抓取源管理页显示空 |
| P1-6 | admin/providers "新增"按钮功能未实现 | 无法通过后台添加厂商 |
| P1-7 | diffModel 导出但未被调用 | 模型字段变更不检测 |

### P2：后续优化

| # | 问题 | 影响 |
|---|---|---|
| P2-1 | `apps/worker/src/llm/` 目录缺失 | cn-provider 只能解析表格结构页面 |
| P2-2 | 无 SourceAdapter 接口约束 | 各 source 函数返回结构不一致 |
| P2-3 | 移动端适配不完整 | 部分页面在小屏未测试 |
| P2-4 | 无部署配置（Dockerfile/vercel.json） | 无法一键部署 |
| P2-5 | 无 SEO sitemap/robots.txt 自动生成 | SEO 效果受限 |

### P3：长期规划

| # | 问题 | 影响 |
|---|---|---|
| P3-1 | 新厂商自动发现机制未实现 | 依赖人工添加 |
| P3-2 | 无用户系统（无注册/登录/OAuth） | 点评为 anonymous |
| P3-3 | 无监控告警 | Worker 失败无法主动通知 |
| P3-4 | 无 API 限流/鉴权 | `/api/v1/*` 端点公开无保护 |

---

## 19. 下一步优化建议

### P0：必须优先做

1. **接入 `/api/v1/recommend` API**：将 `/recommend` 页面 `getResults()` 的硬编码数据改为 `fetch('/api/v1/recommend')`
2. **实现新闻 pipeline**：在 worker 中调用 news-registry 配置的 RSS/API 源 → news_items 入库
3. **填充厂商种子数据**：用 LLM 批量生成 12 家厂商的 short_description/long_description/strengths/main_products → 人工审核 → publish

### P1：MVP 上线前做

1. 将 5 个 mock 页面接入真实 DB 查询
2. 实现 llm-prices historical 数据 → price_change_log 入库
3. 接入 source_snapshots 和 source_fetch_logs 持久化
4. 完善后台厂商管理功能
5. 补充 `.env.example` 中缺失的 LLM 配置

### P2：增长和商业化

1. 邀请链接/推广链接（sponsored/nofollow）
2. sitemap.xml + robots.txt 自动生成
3. 价格提醒/优惠提醒
4. 数据导出（CSV/JSON）

### P3：长期能力

1. 新厂商自动发现
2. LLM 结构化抽取（完成 `apps/worker/src/llm/`）
3. 用户系统
4. 企业选型报告

---

## 20. 本地运行和部署说明

### 前置条件

- Node.js ≥ 20
- Docker（用于 PostgreSQL）
- npm（已配置 npm workspaces）

### 快速启动

```bash
# 1. 克隆并进入项目
cd ai-price-radar

# 2. 启动 PostgreSQL
docker compose up -d postgres adminer

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，默认配置即可（DATABASE_URL 已预填 docker-compose 默认值）

# 5. 初始化数据库
npm run db:migrate    # 创建 19 张表
npm run db:seed       # 写入 12 家 provider + 1 条汇率

# 6. 启动开发服务
npm run dev           # 同时启动 web (localhost:3000) + worker

# 7. 手动触发抓取（可选，worker 默认每小时自动运行）
npm run scrape:all
```

### 访问地址

| 地址 | 用途 |
|---|---|
| http://localhost:3000 | 前台首页 |
| http://localhost:3000/admin | 后台管理 |
| http://localhost:3000/recommend | AI 模型推荐助手 |
| http://localhost:3000/calculator | 价格计算器 |
| http://localhost:8080 | Adminer（数据库管理） |

### 常见问题

- **数据库连接失败**：确认 `docker compose up -d postgres` 已运行，`.env` 中 `DATABASE_URL` 正确
- **抓取超时**：国内厂商 Playwright 抓取依赖网络环境，可单独测试：`npm -w worker run scrape:openrouter`
- **页面数据为空**：首次启动后需等待 worker 抓取一轮（约 30-60 秒），或手动 `npm run scrape:all`

---

## 21. 验收清单

| 模块 | 是否完成 | 当前状态 | 问题 | 下一步 |
|---|---|---|---|---|
| 首页 | ✅ | 真实数据驱动（需 DB） | 无 DB 时数据为空 | 接入真实数据源即可 |
| 模型库 | ✅ | 真实数据驱动 | — | — |
| 模型详情 | ✅ | 真实数据驱动 | 价格趋势图无历史数据 | llm-prices historical 入库 |
| 模型更新日志 | ⚠ | Mock（3 个示例） | 未接入 DB | 接入 price_change_log 查询 |
| 厂商一览 | ✅ | 真实数据驱动 | — | — |
| 厂商档案 | ⚠ | Schema 完整但数据稀疏 | long_description 等丰富字段未填充 | 批量生成 + 人工审核 |
| 厂商动态 | ⚠ | Mock（4 个示例） | 未接入新闻 pipeline | 新闻 pipeline 实现 |
| API 价格 | ✅ | 真实数据驱动 | — | — |
| 会员/Plan | ⚠ | Mock（5 家示例） | 未接入 subscription_plans 查询 | 接入真实 DB 查询 |
| 价格计算器 | ✅ | 真实数据驱动 | — | — |
| 推荐助手 | ⚠ | 页面完成，结果硬编码 | 未调用 /api/v1/recommend | getResults() 改为 fetch API |
| 推荐算法 | ✅ | 13 个测试通过 | — | — |
| 优惠活动 | ✅ | 有 DB 则真数据 | — | — |
| 每日 AI 动态 | ⚠ | Mock（10 条示例） | 新闻 pipeline 未实现 | 实现新闻抓取 |
| 抓取系统 | ✅ | 5 个 adapter 全部真实网络 | 无重试/快照/日志持久化 | 补全 worker 完整性 |
| 数据源管理 | ✅ | 页面可用 | 新增按钮待完善 | 完善 admin/providers |
| 人工复核 | ✅ | 数据库 + 页面可用 | — | — |
| 用户点评 | ✅ | 前端 + API + 审核完整 | — | — |
| 厂商档案字段 | ⚠ | Schema 定义完整 | 数据未填充 | 批量生成 |
| 商业化链接 | ❌ | 未实现 | — | P2 阶段 |
| 合规声明 | ✅ | SiteDisclaimer + 各页底部 | — | — |
| SEO 页面 | ⚠ | compare/[pair] 模板存在 | sitemap/robots 未生成 | 自动生成 |
| 部署 | ❌ | 仅本地 docker-compose | 无 Dockerfile/vercel | 编写部署配置 |

---

> **总结**：项目核心架构完成度约 80%。数据链路（抓取→入库→展示）已打通，diff 引擎和 review_queue 保证数据安全。主要缺口在于 5 个页面的 mock 数据切换、新闻 pipeline 实现、厂商档案数据填充。所有价格数据强制带 source_url，不会发生无来源数据上线的问题。
