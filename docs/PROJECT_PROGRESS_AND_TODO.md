# AI 模型价格雷达项目进度与待办报告

> 最后更新：2026-06-14 01:00 UTC+8
> 服务器：175.178.213.71 | GitHub：Kannanyyd/aileida-plus

---

## 1. 项目定位

**AI 模型价格监控 + 多源对比 + 成本选型决策工具**，不是普通 AI 导航站。

核心能力：实时追踪国内外 AI 模型 API 价格、多渠道价格对比、价格变化监控、多维度排行榜、推荐助手。

---

## 2. 当前总体状态

| 维度 | 状态 |
|---|---|
| 服务器 | ✅ 175.178.213.71:3000 |
| Docker | ✅ 3 容器 (web/worker/postgres) |
| 数据库 | ✅ 19 张表，数据量见第 4 节 |
| GitHub | ⚠️ HEAD=b585d1f，远程=fef4125，领先 10 commits |
| 域名 DNS | ✅ skillstop.online → 175.178.213.71（dig @1.1.1.1 验证） |
| 本地代理 Fake-IP | ⚠️ Clash/Mihomo TUN 返回 198.18.x.x，不影响公网 |
| Nginx | ⚠️ 已安装，配置需完善 |
| HTTPS | ❌ 未配置 |
| Playwright/Chromium | ❌ Docker Hub 国内不可达，无法构建含 Chromium 镜像 |

---

## 3. 已完成模块

### 3.1 前端页面（14 个）

| 页面 | 路由 | 数据来源 |
|---|---|---|
| 首页 | `/` | 真实 DB |
| 模型库 | `/models` | 真实 DB (3881 条) |
| 模型详情 | `/models/[slug]` | 真实 DB + **多渠道价格表** |
| 厂商列表 | `/providers` | 真实 DB (153 家) |
| 厂商详情 | `/providers/[slug]` | 真实 DB |
| 排行榜总览 | `/rankings` | 真实 DB（12 榜单入口） |
| 排行榜详情 | `/rankings/[type]` | 真实 DB + 精选/全量 + Top20/50/100 |
| 推荐助手 | `/recommend` | 真实 DB |
| 模型对比 | `/compare` | 真实 DB + API |
| 后台管理 | `/admin` | 真实 DB |
| 后台登录 | `/admin-login` | 密码鉴权 |
| AI 新闻 | `/ai-news` | 真实 DB |
| 订阅方案 | `/plans` | 真实 DB |
| 价格计算器 | `/calculate` | 真实 DB |

### 3.2 后端 API（8 个）

| 接口 | 说明 |
|---|---|
| `/api/v1/models` | 模型列表，支持 limit/query |
| `/api/v1/models/[slug]` | 模型详情 |
| `/api/v1/models/[slug]/pricing` | **多渠道价格**（新增） |
| `/api/v1/providers` | 厂商列表 |
| `/api/v1/rankings/[type]` | v3：支持 diversity_mode, limit, freshness 权重 |
| `/api/v1/recommend` | 推荐助手 |
| `/api/v1/calculate` | 价格计算 |
| `/api/v1/promotions` | 优惠列表 |

**全部读取真实数据库，无 mock 数据。**

### 3.3 排行榜 v3

- 12 个预设榜单 + 精选/全量双模式
- 模型分层：current_frontier / current_mainstream / previous_generation / legacy / deprecated
- 新鲜度权重：frontier=100, mainstream=75, prev-gen=45, legacy=20, deprecated=0
- 默认隐藏旧模型（show_legacy=true 可显示）
- 默认隐藏废弃模型（show_deprecated=true 可显示）
- 厂商多样性：精选榜同厂商 ≤5、同家族 ≤3
- 支持 Top20/50/100 + 分页

### 3.4 Worker 抓取

- ✅ 每小时 cron `0 * * * *`
- ✅ 启动 5 秒后首次全量抓取
- ✅ 手动命令：`crawl:once` / `scrape:all`
- ✅ 日志：source_fetch_logs（277 条）+ source_snapshots（208 条）
- ✅ 失败记录 error_message + 耗时

---

## 4. 数据库

| 表 | 用途 | 数据量 |
|---|---|---|
| providers | AI 厂商 | 153 |
| models | AI 模型 | 3881 |
| pricing | API 价格（**支持多渠道/区域**） | 3371 |
| price_change_log | 价格变化 | 821 |
| promotions | 优惠/活动 | 56 |
| source_fetch_logs | 抓取日志 | 277 |
| source_snapshots | 抓取快照 | 208 |
| review_queue | 人工复核 | 709（去重后） |
| subscription_plans | 订阅方案 | 有 |
| product_offerings | 产品服务 | 有 |
| others | 新闻/用户点评/汇率等 | 有 |

**pricing 已支持字段**：platform, is_official, is_aggregator, is_domestic, region, channel

---

## 5. 抓取源状态

| 源 | 厂商 | 模型 | 价格 | 状态 |
|---|---|---|---|---|
| LiteLLM | 83 | 2330 | 2330 | ✅ |
| OpenRouter | 57 | 333 | 299 | ✅ |
| llm-prices | 10 | 117 | 58 | ✅ |
| genai-prices | 33 | 1088 | 684 | ✅ |
| 国内 9 家合计 | 5 | 63 | **0** | ⚠️ 不完整 |

### 国内 scraper 明细

| 厂商 | provider | models | pricing | 原因 |
|---|---|---|---|---|
| 阿里云百炼 | ✅ | 50 | ❌ 0 | SPA shell |
| 火山方舟 | ❌ | 0 | ❌ 0 | SPA text=0 |
| 腾讯混元 | ✅ | 4 | ❌ 0 | 静态 HTML，无价格模式 |
| 百度千帆 | ✅ | 4 | ❌ 0 | 同上 |
| 智谱 GLM | ❌ | 0 | ❌ 0 | SPA |
| Kimi | ❌ | 0 | ❌ 0 | SPA |
| DeepSeek | ❌ | 0 | ❌ 0 | docs 无价格表 |
| MiniMax | ❌ | 0 | ❌ 0 | SPA |
| 硅基流动 | ✅ | 5 | ❌ 0 | 静态 HTML |

> ⚠️ **国内价格全部暂缺**，原因：国内页面为 SPA，需要 Playwright Chromium 渲染。当前 Docker 镜像不含 Chromium（Docker Hub 国内不可达）。

---

## 6. 最近修复的问题（15 个）

| # | 问题 | 根因 | 修复 | 残留风险 |
|---|---|---|---|---|
| 1 | PG 密码错误 | .env 未加载 | docker compose --env-file | 无 |
| 2 | relation not exist | 迁移未执行 | db:migrate | 无 |
| 3 | tsx not found | tsx 在 devDeps | 移到 dependencies | 无 |
| 4 | EACCES | 容器内 npm install | Dockerfile 预装 | 无 |
| 5 | llm-prices 404 | URL 错误 | llm-prices.com/current-v1.json | 第三方 API 变更 |
| 6 | genai-prices 404 | URL 变更 | data_slim.json + fallback | 同上 |
| 7 | worker 静默失败 | 无日志 | fetch-log.ts 模块 | 无 |
| 8 | snapshots 仅 4 条 | 仅 JSON 源有 | 所有源生成 summary | 无 |
| 9 | review_queue 5621 | 无去重 | model_id 去重 → 709 | 需监控 |
| 10 | price_change_log 误报 | 多源差异→变化 | diff 不同 source→conflict | 无 |
| 11 | Playwright 卡死 | npx playwright install | 代码级降级 HTTP | ⚠️ 国内 SPA 仍无价格 |
| 12 | 国内 SPA 返回空 | Playwright 不可用 | HTTP fallback + SPA 检测 | ⚠️ 同上 |
| 13 | DNS 误判 | 本地 Clash Fake-IP | 服务器 dig 验证 → DNS 正确 | 无 |
| 14 | onClick SSR error | Server Component | model-card "use client" | 无 |
| 15 | 排行榜旧模型 | 无新鲜度评分 | v3: freshness weight + hideLegacy 默认 | 需验证 |

---

## 7. 当前遗留问题（P0 优先级）

1. **GitHub 未 push**：10 commits 未推送，代码丢失风险 🔴
2. **国内 scraper 无价格**：0 条价格，需 Playwright Chromium 🔴
3. **pricing region 未区分**：LiteLLM 中国内厂商 region 仍为 "global" 🔴
4. **推荐助手未区分新旧模型**：需接入 freshness 分层 🟡
5. **review_queue 后台 UI 缺失**：只有 SQL 操作 🟡

---

## 8. 待办事项

### P0 — 立即处理

- [ ] GitHub push
- [ ] pricing region backfill（国内厂商 → china_mainland）
- [ ] Docker 镜像代理 → 构建 Chromium worker
- [ ] 国内 scraper 运行（Playwright 可用后）
- [ ] 榜单/推荐默认过滤旧模型 ✅（v3 已做）

### P1 — 核心体验

- [ ] review_queue 后台 UI
- [ ] 国内 scraper CSS 选择器完善
- [ ] 推荐助手区域筛选
- [ ] 厂商详情页补充介绍
- [ ] 排行榜多渠道价格合并展示
- [ ] 数据库备份

### P2 — 上线前

- [ ] Nginx + HTTPS + 域名
- [ ] SEO metadata / sitemap
- [ ] 404/500 页面
- [ ] API 限流

### P3 — 商业化

- [ ] 用户账号 / 收藏 / 提醒
- [ ] Pro 会员
- [ ] API 数据订阅

---

## 9. 产品方向校准

1. 不是 AI 导航站 → 价格监控 + 选型决策工具
2. 不纯按价格排序 → 综合评分含新鲜度
3. 默认不推旧模型 → 旧模型只进"旧模型低价榜"
4. 同名模型不覆盖 → 保留多渠道/区域价格
5. 榜单不刷屏 → 精选榜同厂商 ≤5、同家族 ≤3
6. 推荐有理由 → 每条带排名解释
7. 价格有溯源 → source_url + 更新时间 + 币种 + 可信度
8. 国内未完成标注 → need_manual_review + 原因
9. 无 mock 数据 → 全站真实 DB
10. 多源冲突进 review_queue → 不覆盖

---

## 10. 当前验收数据

| 指标 | 值 |
|---|---|
| providers | 153 |
| models | 3881 |
| pricing | 3371 |
| price_change_log | 821 |
| source_fetch_logs | 277 |
| source_snapshots | 208 |
| review_queue | 709 |
| `/` HTTP | 200 |
| `/models` HTTP | 200 |
| `/providers` HTTP | 200 |
| `/models/[slug]` HTTP | 200 |
| `/rankings/[type]` HTTP | 200 |
| `/compare` HTTP | 200 |
| web 容器 | Up |
| worker 容器 | Up |
| postgres | Healthy |

### 定价来源分布

| 源 | 数量 |
|---|---|
| LiteLLM | 2330 |
| genai-prices | 684 |
| OpenRouter | 299 |
| llm-prices | 58 |

### 定价区域分布

| 区域 | 渠道 | 数量 |
|---|---|---|
| global | official | 3072 |
| overseas | aggregator | 299 |

> ⚠️ **国内价格暂缺**：region=china_mainland 的 pricing 为 0 条。需要 backfill LiteLLM 国内厂商数据 + Playwright 抓取国内平台。

---

## 11. 风险与建议

| 风险 | 建议 |
|---|---|
| 代码未 push | **立即 git push** |
| 敏感文件泄露 | 确认 .gitignore 覆盖 .env/.pem |
| Docker Hub 不可达 | 配置稳定镜像代理 |
| 国内 SPA 无价格 | Playwright Chromium 必须可用 |
| 多源价格冲突 | review_queue 治理 |
| 无数据库备份 | 每日 pg_dump |
| 第三方 API 结构变更 | 监控 source_fetch_logs error_message |

---

## 12. 下一步执行顺序（Top 10）

1. **git push origin main**
2. **pricing region backfill**：国内厂商 → china_mainland
3. **Docker 镜像代理**：拉取 node:22-slim
4. **构建 Chromium worker** + 运行国内 scraper
5. **review_queue 后台 UI**：筛选 + 批量操作
6. **推荐助手接入 freshness**：默认优先主流模型
7. **排行榜多渠道合并**：同一模型默认展示一条
8. **厂商详情页补充**：真实介绍
9. **Nginx + 域名**：skillstop.online 正式入口
10. **数据库备份**：cron pg_dump
# 最新状态更新：P1 review_queue / pricing gaps 后台治理

更新时间：2026-06-14 20:27 UTC+8

## 当前代码与部署

- 最新 commit：`6f94857`
- GitHub：已 push 到 `origin/main`
- 服务器：`175.178.213.71`
- 服务器路径：`~/aileida-plus`
- 服务器 HEAD：`6f94857`
- SSH key：`D:\Agent\自动化\AI订阅雷达\NewLeiDa.pem`
- 已正式 rebuild：web / worker
- 已执行数据库迁移：`npm run db:migrate`
- 容器状态：web Up，worker Up，postgres Healthy

## 本轮完成

- 新增后台 review queue 列表页：`/admin/review-queue`
- 新增后台 review queue 详情页：`/admin/review-queue/[id]`
- 增强国内价格缺口页：`/admin/pricing-gaps`
- 新增 admin API：
  - `GET /api/admin/review-queue`
  - `GET /api/admin/review-queue/[id]`
  - `POST /api/admin/review-queue/[id]/approve`
  - `POST /api/admin/review-queue/[id]/reject`
  - `POST /api/admin/review-queue/[id]/ignore`
  - `POST /api/admin/review-queue/[id]/needs-more-info`
  - `POST /api/admin/review-queue/bulk`
  - `GET /api/admin/pricing-gaps`

## 数据库与工作流

- `review_queue` 新增字段：
  - `dedupe_key`
  - `last_seen_at`
  - `occurrence_count`
  - `latest_payload`
  - `latest_error_message`
- 新增审计表：`review_audit_logs`
- 新增 pending 去重索引：`review_pending_dedupe_uq`
- worker 后续写入 review_queue 已改为 upsert 去重：
  - 相同问题重复抓取时更新 `last_seen_at`
  - 增加 `occurrence_count`
  - 更新 `latest_payload`
  - 更新 `latest_error_message`
  - 不再无限新增重复 pending 项

## 后台能力

- `/admin/review-queue` 支持筛选：reason、provider、canonical_provider、model_family、currency、region、source_provider、selling_platform_provider、status、has_source_url、has_snapshot、confidence_min、created_from、created_to、q。
- `/admin/review-queue/[id]` 支持查看 payload、source_url、source snapshot 摘要、已有 pricing、同模型其他渠道价格，并支持 approve pricing、ignore、reject、needs_more_info。
- `/admin/pricing-gaps` 支持 provider、models、CNY pricing、missing CNY pricing、review pending、source status、next action。

## 当前 review_queue 状态

| reason | count |
|---|---:|
| low-confidence-new-pricing | 486 |
| latest-model-missing-pricing | 336 |
| multi-source-divergence | 197 |
| official-new-model | 172 |
| low-confidence | 26 |
| possible-deprecated | 13 |

- 总数：`1233`
- 当前 pending 旧重复：117 组、158 条重复行
- 旧重复未清理，避免误删历史审计数据
- 新重复写入机制已生效

## 验收结果

- `/`、`/models`、`/models/new`、`/providers`、`/rankings`、`/recommend`、`/compare` 全部 200。
- `/admin`、`/admin/review-queue`、`/admin/pricing-gaps`、`/admin/data-quality` 未登录全部 307。
- `/admin/review-queue`、`/admin/pricing-gaps`、`/admin/review-queue/[id]` 已登录全部 200。
- `/api/admin/review-queue`、`/api/admin/pricing-gaps` 未登录 401；已登录可返回数据。
- 日志未发现：`500 / digest / relation does not exist / tsx not found / EACCES / password authentication failed / server-side exception`。

## 操作闭环验收

- approve：已用 smoke test 验证，可从 review_queue 写入 pricing
- ignore：已验证
- reject：已验证
- audit log：已验证写入
- 测试 pricing 已删除，避免污染真实价格
- smoke test review/audit log 保留用于验收追踪

## 国内 pricing gaps 样例

| provider | models | CNY pricing | missing CNY |
|---|---:|---:|---:|
| alibaba-cloud | 505 | 5 | 500 |
| siliconflow | 34 | 6 | 28 |
| moonshot | 27 | 3 | 24 |
| minimax | 20 | 0 | 20 |
| deepseek | 19 | 2 | 17 |
| bytedance-volcano | 10 | 0 | 10 |
| baidu-qianfan | 14 | 5 | 9 |
| tencent-hunyuan | 14 | 6 | 8 |
| zhipu | 2 | 0 | 2 |

## 后续建议

1. 不处理 DNS / Nginx / HTTPS，除非用户明确切换任务。
2. 不硬卡 Chromium / Playwright。
3. review_queue 旧重复如需清理，先做只读 SQL 审计和迁移方案，不直接删除。
4. pricing gaps 下一轮优先补 MiniMax、火山方舟、智谱、阿里百炼大缺口。
5. 后台 bulk 当前只做状态处理，暂不做批量价格入库，避免误操作。

---
