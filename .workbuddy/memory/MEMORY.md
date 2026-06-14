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
