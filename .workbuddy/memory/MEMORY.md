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
