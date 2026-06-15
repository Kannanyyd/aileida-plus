# AI 订阅雷达 — 项目记忆

## 项目定位
- AI 模型价格雷达网站（ModelPrice Radar）
- 深色科技数据看板风格：`#070B18` 主背景，`#4F7CFF` 品牌色，`#22C55E`（降）/`#EF4444`（涨）
- 不许展示无来源价格；每条数据必有 source_url/snapshot/confidence/need_manual_review

## 技术栈
- Next.js 15 App Router (TS) + Tailwind + Drizzle ORM + PostgreSQL 16
- Worker: Playwright + cheerio + undici（抓取层独立进程）
- 共享包: @pricing/core（TS 计算引擎）
- monorepo: npm workspaces（apps/web, apps/worker, packages/pricing-core）

## 部署（生产）
- 服务器：175.178.213.71（Ubuntu 24.04）
- Docker Compose：aileida-web / aileida-worker / aileida-postgres
- 端口：3000（HTTP only，无 Nginx/HTTPS）
- 域名：skillstop.online DNS 已指向 175.178.213.71（dig @1.1.1.1 验证）
- GitHub：Kannanyyd/aileida-plus（public）
- SSH 私钥：`NewLeiDa.pem`（⚠️ 不提交 Git）

## ⚠️ Docker Hub 阻塞
- Docker Hub 国内不可达，无法 `docker compose build web --no-cache`
- 线上容器运行的是旧镜像（2026-06-13 19:33），最新源码仅存在于 GitHub
- `.next` 热修注入不可靠（新旧 Webpack chunk ID 冲突 → 500 或 crash）
- 恢复步骤：配置镜像代理 → `docker compose build web` → `up -d`
- 详细文档：`docs/HOTFIX_RISK.md`

## 数据完整性规则
- 新模型 + 高置信度(≥0.8) + 单源 → 自动更新
- 多源冲突(差异 >10%) 或 低置信度(<0.6) → 进 review_queue
- 多源差异（不同 source_id）始终标记为 conflict（不写 price_change_log）
- 同源更新 → 写入 price_change_log
- 禁止低置信度覆盖高置信度
- 禁止自动合并冲突价格
- review_queue 插入前去重（按 model_id + reason）

## 排行榜 v3（源码已实现，线上暂未生效）
- 12 个榜单 + 精选/全量双模式
- freshness 评分：current_frontier=100, mainstream=75, prev-gen=45, legacy=20, deprecated=0
- 默认隐藏旧模型（show_legacy=true 可显示）
- 厂商多样性：精选榜同厂商≤5、同家族≤3
- Top20/50/100 + 分页
- rank() 向后兼容 `.slice()`/`.map()`/`.length`

## pricing 表多渠道支持
- 字段：platform, is_official, is_aggregator, is_domestic, region, channel
- UNIQUE：(model_id, pricing_type, channel, region, primary_source_id)
- 同一模型可有多条：国内/海外/官方/聚合/云平台
- region 区分：global (3028) / overseas (299) / china_mainland (44)
- 国内价格暂缺（SPA 需 Playwright Chromium）

## 数据库当前状态
- providers: 153 | models: 3881 | pricing: 3371
- source_fetch_logs: 277 | source_snapshots: 208 | review_queue: 709
- price_change_log: 821 | promotions: 56

## 抓取源
- LiteLLM ✅ / OpenRouter ✅ / llm-prices ✅ / genai-prices ✅
- 国内 9 家 ⚠️（0 价格，SPA 需 Playwright）
- Worker 每小时 cron，启动 5 秒首次全量

## 已知问题
- `/rankings/[type]` 和 `/compare` 线上 404（源码已有，需 Docker 重建）
- 国内 scraper 无价格（Playwright 不可用）
- Docker Hub 不可达
# 最新接手状态：P1 review_queue / pricing gaps 后台治理

更新时间：2026-06-14 20:27 UTC+8

- 最新 commit：`6f94857`
- GitHub：`origin/main = 6f94857`
- 服务器：`~/aileida-plus = 6f94857`
- 可用 SSH key：`D:\Agent\自动化\AI订阅雷达\NewLeiDa.pem`
- 默认 `id_ed25519` 对当前服务器不可用。
- 已正式 rebuild：web / worker。
- 已执行迁移：`npm run db:migrate`。
- 容器：web Up，worker Up，postgres Healthy。

本轮完成：
- `/admin/review-queue`
- `/admin/review-queue/[id]`
- `/admin/pricing-gaps`
- `/api/admin/review-queue`
- `/api/admin/review-queue/[id]`
- `/api/admin/review-queue/[id]/approve`
- `/api/admin/review-queue/[id]/reject`
- `/api/admin/review-queue/[id]/ignore`
- `/api/admin/review-queue/[id]/needs-more-info`
- `/api/admin/review-queue/bulk`
- `/api/admin/pricing-gaps`

数据库：
- `review_queue` 新增 `dedupe_key / last_seen_at / occurrence_count / latest_payload / latest_error_message`。
- 新增 `review_audit_logs`。
- 新增 pending 去重索引 `review_pending_dedupe_uq`。
- worker 后续写 review_queue 已改为 upsert 去重，重复抓取更新 occurrence，不继续无限新增。

当前 review_queue：
- 总数：`1233`
- `low-confidence-new-pricing`：486
- `latest-model-missing-pricing`：336
- `multi-source-divergence`：197
- `official-new-model`：172
- `low-confidence`：26
- `possible-deprecated`：13
- 旧 pending 重复仍存在：117 组、158 条重复行；未清理，避免误删历史审计。

验收：
- `/`、`/models`、`/models/new`、`/providers`、`/rankings`、`/recommend`、`/compare` 全部 200。
- `/admin/*` 未登录 307。
- `/api/admin/*` 未登录 401。
- `/admin/review-queue`、`/admin/pricing-gaps` 已登录 200。
- approve / ignore / reject API 已 smoke test；测试 pricing 已删除，audit log 保留。
- 日志无 `500 / digest / relation does not exist / tsx not found / EACCES / password authentication failed / server-side exception`。

后续注意：
- 不处理 DNS / Nginx / HTTPS，除非用户明确切换任务。
- 不硬卡 Chromium / Playwright。
- review_queue 旧重复如需处理，先审计方案，不直接删。
- pricing gaps 下一轮优先补 MiniMax、火山方舟、智谱、阿里百炼。
# 最新接手状态：数据一致性复核与旧 review_queue 重复清理

更新时间：2026-06-14 21:18 UTC+8

- 最新源码 commit：`ddd1e00`
- GitHub：`origin/main = ddd1e00`
- 服务器源码：`~/aileida-plus = ddd1e00`
- 生产运行容器：仍是上一版 web 镜像，`ddd1e00` 的 UI/API 改动未上线。
- 阻塞原因：服务器 Docker build/buildx 连续卡住，build cache 清空后仍卡住；已终止挂起进程，未做 `.next`/docker cp 热修。
- 数据库清理：已在生产执行完成。

本轮结论：
- CNY pricing 总数仍为 `32`。
- Kimi / Moonshot 的 8 条 CNY pricing 没丢。
- pricing gaps 旧报告只显示 3 条，是因为 provider 统计按 raw provider 拆成 `moonshotai=5` 和 `moonshot=3`。
- `domesticPricingGapAudit()` 已改为按统一 provider key 统计，CNY pricing 按 `model_owner_provider / selling_platform_provider / source_provider` 任一命中计入。
- 修复后等价 SQL：`moonshot` CNY pricing = 8。

review_queue 清理：
- 清理前 pending 重复组：117
- 清理前 pending 重复行：158
- 已标记 `ignored_duplicate`：158
- 清理后 pending 重复组：0
- 清理后 pending 重复行：0
- 未物理删除，已写 audit log，保留项合并 occurrence/latest/last_seen。

代码增强但未上线：
- `/admin/review-queue` high impact 默认排序、排序控件、更多列、批量操作。
- `approvePricingReview()` 增强必填校验与冲突保护。
- 新增脚本：`npm -w web run review:dedupe`。

当前生产页面：
- `/`、`/models`、`/models/new`、`/providers`、`/rankings`、`/recommend`、`/compare` 全部 200。
- `/admin/*` 未登录 307。
- `/api/admin/*` 未登录 401。
- web/worker/postgres 正常。

下一步优先级：
1. 先修 Docker build/buildx 卡住问题，让 `ddd1e00` 正式 rebuild/up。
2. 不做 DNS / Nginx / HTTPS。
3. 不硬卡 Chromium / Playwright。
4. 不继续扩展新价格源，直到后台统计口径正式部署并验证。
# 最新接手状态：Docker build 修复，ddd1e00 后台加固已正式上线

更新时间：2026-06-14 22:22 UTC+8

- 最新 commit：`2c64635`
- GitHub：已 push
- 服务器源码：`~/aileida-plus = 2c64635`
- web 镜像：已正式 rebuild 并 `up -d web`
- worker 镜像：未 rebuild，本轮无 worker 代码依赖；worker 正常运行
- 未使用 `.next` / docker cp 热修

Docker build 卡住根因：
- 卡点在 web Dockerfile 的 `[7/10] RUN npm install --include=dev`。
- web Dockerfile 未复制 `package-lock.json`，且用 `npm install`，清空 cache 后需要重新解析 workspace dependency。
- BuildKit 的 `only one connection allowed` / `context canceled` 是超时取消后的症状，不是最初根因。
- 已修复为 `COPY package.json package-lock.json tsconfig.base.json ./` + `RUN npm ci --production=false`。

部署验收：
- `/`、`/models`、`/models/new`、`/providers`、`/rankings`、`/recommend`、`/compare` 全部 200。
- `/admin`、`/admin/review-queue`、`/admin/pricing-gaps`、`/admin/data-quality` 未登录 307。
- `/api/admin/review-queue`、`/api/admin/pricing-gaps` 未登录 401。
- 已登录 `/api/admin/review-queue?limit=3` 可用。
- 已登录 `/api/admin/pricing-gaps` 可用。
- `moonshot` CNY pricing 已显示 8。
- pending duplicate groups = 0，pending duplicate rows = 0。
- CNY pricing 总数仍为 32。

ddd1e00 上线确认：
- `/admin/review-queue` 已出现 high impact 默认排序、dedupe/source/last seen/confidence 列、批量按钮。
- approve 缺 `currency_native` 会返回 400，必填校验生效。
- web/worker/postgres 正常，日志无 500/digest/relation/tsx/EACCES/password/server-side exception/rank slice-map 错误。
## 2026-06-14 CNY pricing round 3 handoff

- Current active task: domestic native CNY pricing third round.
- Do not work on DNS/Nginx/HTTPS, Docker build chain, Chromium/Playwright install, commercialization, or large manual price entry.
- Local code changes prepared:
  - Expanded `apps/worker/src/sources/cn-cny-pricing.ts`.
  - Registered new CNY sources in `apps/worker/src/pipeline.ts`.
  - New/expanded sources: MiniMax official, Zhipu official pricing JS, Aliyun Bailian expanded platform prices, SiliconFlow expanded platform prices.
  - Volcengine/Doubao and ModelScope currently write fetch logs/snapshots only; no formal pricing insert because official static content needs manual confirmation or lacks stable token unit prices.
- Local preflight counts before production ingest:
  - SiliconFlow 19 pricing rows.
  - Aliyun Bailian 37 pricing rows.
  - MiniMax 11 pricing rows.
  - Zhipu 8 pricing rows.
  - Volcengine/Doubao 0 pricing rows, snapshot only.
  - ModelScope 0 pricing rows, snapshot only.
- `npm run typecheck` passed locally.
- Next steps: commit/push, deploy/rebuild worker, run `crawl:cny-pricing`, verify CNY pricing total increases from 32 to >=60, then validate pages/API/logs and update final report.

### Completed production result

- Code commit: `7e20a1e feat: expand domestic cny pricing sources`, pushed.
- Server source now at `7e20a1e`.
- Server GitHub fetch hung; stopped the hung fetch and synced with a git bundle, then fast-forward merged.
- Worker image formally rebuilt and restarted; no hotfix.
- Ran production `crawl:cny-pricing`.
- CNY pricing is now 94, up from 32.
- API/page validation:
  - public pages `/`, `/models`, `/models/new`, `/providers`, `/rankings`, `/recommend`, `/compare` are 200.
  - admin pages unauthenticated are 307.
  - admin APIs unauthenticated are 401.
  - domestic ranking Top20 has 18 CNY markers.
  - frontier-value china_mainland has 6 CNY markers out of 12 returned rows.
  - domestic writing recommendation has `relaxedFilters=[]`; budget/balanced/premium Top5 are all CNY.
- Logs: no matching critical errors in web/worker tail.
- Follow-up risk: pending duplicate groups currently query as 1, not 0. This was not cleaned in this round.
## Latest handoff: public trust / SEO pre-launch pass

- Deployment status:
  - `2ae6d85 feat: improve public trust and seo` is pushed and deployed.
  - Server source is `2ae6d85`.
  - Web image was formally rebuilt and restarted. No `.next` hotfix, no `docker cp`.
  - Worker was not rebuilt because this pass was web/UI/docs only.
  - Public pages and robots/sitemap passed smoke test.
  - Admin pages still redirect unauthenticated with 307; admin APIs still return 401 unauthenticated.
  - Recommend domestic writing smoke returns `relaxedFilters=[]`, `pricingGapAlerts=5`, `latestModelAlerts=6`.
  - review_queue duplicate state is clean: `pending_null_dedupe=0`, `pending_duplicate_groups=0`.
  - Logs had no critical matches.

- Priority remains: do not work on DNS/Nginx/HTTPS, Chromium/Playwright, or new price source expansion.
- The previous `pending duplicate groups = 1` was not a real duplicate group. It came from historical pending review rows with null `dedupe_key`.
- Production DB has been backfilled:
  - 896 pending `dedupe_key` values filled.
  - 896 `review_audit_logs` rows inserted.
  - No review rows deleted.
  - `pending duplicate groups = 0`.
- Public page trust features added:
  - Shared `price-trust` display component.
  - Model cards, rankings, model detail, compare, and recommend pages distinguish native CNY, native USD, estimated prices, source links, confidence, channel type, and data quality flags.
  - Model detail shows owner provider, selling platform provider, source provider, multi-channel pricing, update time, and alternatives.
  - Recommend page shows reasons, stronger/cheaper alternatives, pricing gap alerts, and latest unpriced model alerts.
- SEO basics added:
  - Metadata refreshed for core routes.
  - `robots.txt` and `sitemap.xml` added.
- Local checks passed:
  - `npm run typecheck`.
  - `npm -w web run build`.
- Encoding caution:
  - Some old TSX Chinese copy was already corrupted. Rewritten high-traffic pages currently use ASCII-safe copy to keep build stability. Restore polished Chinese microcopy later with a safe UTF-8 workflow.

## Latest handoff: P0 data freshness + homepage curated ranking repair

- Current local work is focused on data freshness and homepage selected Top8 credibility, not broad UI redesign.
- User explicitly asked not to work on DNS/Nginx/HTTPS, Chromium/Playwright, new large pricing-source expansion, or commercialization.
- Implemented locally:
  - Derived model freshness fields from pricing timestamps, source fetch logs, discovery logs, and latest model candidates.
  - Derived supersession fields for same owner/family models: `has_newer_family_model`, `superseded_by_model_id`, `is_current_default_pick`.
  - Ranking API supports `max_source_age_hours`, `hide_stale`, `hide_superseded`; default ranking payload returns freshness fields and `why_ranked`.
  - Homepage uses strict 12h freshness Top8, hides stale/superseded/old/unknown/manual-review candidates, limits provider/family repetition, and displays freshness cards.
  - Recommendation API filters stale/superseded models by default for non-cheapest scenarios and returns freshness metadata.
  - Added worker command `npm run audit:freshness` plus root aliases `freshness:audit` and `crawl:pricing`.
- Local checks passed:
  - `npm run typecheck`
  - `npm -w web run build`
  - `npm -w worker run build`
- Local `npm run audit:freshness` failed only because local Postgres is not running at `127.0.0.1:5432`; run in production worker/container after deployment.
- Production before deployment of this round:
  - Server source was `f9f4317`.
  - web/worker/postgres were up.
  - Need formal web and worker rebuild; no `.next` hotfix / no `docker cp`.

### Production result

- Final code commit deployed for this round: `decef06`.
- Web was formally rebuilt/restarted for homepage freshness/ranking changes.
- Worker was formally rebuilt/restarted for `audit:freshness`.
- `audit:freshness` now calls the real ranking API for homepage Top8 and also prints SQL fallback/oldest source/pricing diagnostics.
- Production source freshness: 23 sources, `stale_over_12h=0`, `stale_over_24h=0`.
- Homepage Top8 from ranking API is fresh, not superseded, and only current_frontier/current_mainstream.
- Domestic ranking Top8 sample is all native CNY and fresh.
- Recommend domestic writing smoke has `relaxedFilters=[]` and fresh CNY-priced balanced results.
- Public pages are 200, admin pages unauthenticated are 307, admin APIs unauthenticated are 401.
- Logs had no critical matches.

## Latest handoff: system logic audit / architecture freeze

- User asked to pause all new feature development, price-source expansion, Chinese copy, SEO, HTTPS/DNS/Nginx, and UI redesign.
- Goal of this round: document how data flows through the system and freeze source-of-truth rules, not fix another single page.
- Added:
  - `docs/SYSTEM_INVARIANTS.md`
  - `docs/SYSTEM_LOGIC_AUDIT.md`
- Production audit facts:
  - `audit:homepage-currentness` and `audit:official-current` already exist and were used as audit inputs.
  - Direct SQL found stored `current_frontier=15`.
  - Stored `current_mainstream=26`.
  - Stored `current_mainstream` rows all have `needs_pricing_review=true` and `with_pricing=0`.
  - Pricing sources stale over 12h: 0.
- Important architectural finding:
  - Stored lifecycle tier is not the product-facing currentness decision today.
  - Runtime enrichment from official-current catalog is what makes strict homepage Top8 safe.
  - The legacy `freshness_status` field still exists and may confuse future frontend work.
- Next best work:
  - Alias-level dedupe for official catalog equivalents.
  - Insert missing official-current models as price-pending candidates.
  - Move official-current catalog from code to DB/admin governance.
  - Deprecate ambiguous API fields.

## Latest handoff: official-current coverage + homepage Top8 currentness

- Current round responds to `D:\Desktop\下一步.txt`: the website logic is still messy because homepage Top8 treats recently checked source data as if the model itself is current.
- Do not work on DNS/Nginx/HTTPS, Chromium/Playwright, new price sources, commercialization, broad UI redesign, or broad Chinese copy polish in this round.
- Root cause:
  - `freshness_status` represented source/pricing check recency, not model-version recency.
  - `current_mainstream` was too permissive for homepage selection.
  - Production pre-fix Top8 included `mimo-v2.5` and `openrouter/xiaomi/mimo-v2.5`; both are fresh data rows, but not reliable official-current homepage picks.
- Local code changes now prepared:
  - Added `packages/pricing-core/src/official-current/index.ts` as a conservative official current/recommended/latest catalog.
  - Web model enrichment now exposes `source_freshness_status`, `model_recency_status`, `is_official_current`, `is_official_recommended`, and `official_current_*` fields.
  - Homepage strict ranking now requires official-current catalog evidence through `requireOfficialCurrent`.
  - Ranking API supports `homepage_strict=true` and `require_official_current=true`.
  - Added worker audit commands:
    - `npm run audit:official-current`
    - `npm run audit:homepage-currentness`
- Local validation:
  - `npm run typecheck` passed.
  - `npm run build` passed.
- Next required steps:
  1. Commit/push.
  2. Deploy with formal web and worker rebuilds.
  3. Run the new audits in production.
  4. Confirm homepage strict Top8 no longer includes old/non-official-current substitutes.

### Production result

- Final code commit for this round: `7a448fb`.
- Web image formally rebuilt/restarted for official-current homepage filtering.
- Worker image formally rebuilt/restarted for `audit:official-current` and `audit:homepage-currentness`.
- Production `audit:homepage-currentness` passed:
  - strict homepage Top8 has `all_official_current_or_recommended=true`.
  - `previous_stale_unknown_count=0`.
  - `missing_official_source_count=0`.
  - `source_fresh_but_model_not_current_count=0`.
  - `superseded_count=0`.
  - `failing=[]`.
- Strict homepage Top8 after fix:
  - `minimax-m3`
  - `gemini-flash-latest`
  - `kimi-k2.7-code`
  - `grok-4.20`
  - `claude-opus-4.8`
  - `kimi-k2.6`
  - `gemini-3.5-flash`
  - `gpt-5.5`
- Rows removed from strict homepage selection include:
  - `mimo-v2.5`
  - `openrouter/xiaomi/mimo-v2.5`
  - `gpt-5-codex` unless/until it gets official-current catalog evidence.
- `audit:official-current` passed and reported DB gaps:
  - Missing: `llama-4-maverick`, `llama-4-scout`, `command-r-plus-08-2024`, `north-mini-code-1-0`, `doubao-seed-1.6`, `glm-4.6`.
  - In DB but no pricing: `mistral-medium-3.5`.
- Public pages returned 200; admin pages returned 307 unauthenticated; admin APIs returned 401.
- Logs had no critical matches.

## Latest handoff: official-current catalog stabilization phase 1
- Scope lock: do not do DNS/Nginx/HTTPS, Chinese copy/SEO, new price sources, UI redesign, or commercial features.
- Goal: make homepage official-current selection depend on DB-backed catalog + exact alias mapping, not fuzzy model-family fallback.
- Local changes prepared:
  - packages/pricing-core/src/official-current/index.ts: removed fuzzy family fallback; explicit grok-4.20 -> grok-4-0709.
  - DB/migration/schema: added official_current_models, official_model_aliases, official_catalog_runs.
  - apps/web/lib/db/queries.ts: DB catalog preferred; code catalog is marked code-fallback.
  - apps/web/lib/rank/score.ts: diversity family key prefers official_current_model_slug; API marks freshness_status deprecated.
  - apps/worker/src/cli/sync-official-current.ts: syncs code catalog to DB, upserts candidates/review_queue for missing official-current models and price-pending models.
  - Admin pages: /admin/official-current, enhanced /admin/model-aliases.
  - Audits: audit:homepage-currentness, audit:official-current, audit:freshness-fields.
- Local validation passed: core/web/worker typecheck, web build, worker build, audit:freshness-fields.
- Local DB migration was not run because local PostgreSQL was down; production migration and sync still required before deployment validation.
