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
# 最新状态更新：数据一致性复核与旧 review_queue 重复清理

更新时间：2026-06-14 21:18 UTC+8

## 当前代码与部署

- 最新源码 commit：`ddd1e00`
- GitHub：已 push 到 `origin/main`
- 服务器源码：`~/aileida-plus = ddd1e00`
- 生产运行容器：仍是上一版 web 镜像，`ddd1e00` 的后台 UI/API 代码尚未上线
- 数据库清理：已在生产执行完成
- 部署阻塞：服务器 Docker build/buildx 连续卡住，清空 31GB build cache 后仍卡住；已终止挂起进程
- 未使用 `.next` / docker cp 热修

## CNY pricing 数据一致性复核

- 全库 CNY pricing 总数：`32`
- Kimi / Moonshot 上一轮 8 条 CNY pricing 仍存在
- 不一致根因：pricing gaps 旧查询按 raw model provider 分组，拆成：
  - `moonshotai`：5
  - `moonshot`：3
- 不是 pricing 被删除，不是测试清理误删
- 已修复 `domesticPricingGapAudit()` 统计口径：
  - 模型数量按 owner/model provider 归属统计
  - CNY pricing 按 `model_owner_provider / selling_platform_provider / source_provider` 任一命中统计
  - 避免漏算平台价，例如硅基流动卖 DeepSeek、阿里百炼卖 Qwen、Kimi 的 `moonshotai/moonshot` 分裂

修复后等价 SQL 样例：
| provider | models | CNY pricing | missing CNY |
|---|---:|---:|---:|
| moonshot | 43 | 8 | 35 |
| alibaba-cloud | 529 | 7 | 522 |
| deepseek | 33 | 6 | 27 |
| siliconflow | 34 | 6 | 28 |
| tencent-hunyuan | 16 | 6 | 10 |
| baidu-qianfan | 19 | 5 | 14 |
| bytedance-volcano | 10 | 0 | 10 |
| minimax | 21 | 0 | 21 |
| zhipu | 2 | 0 | 2 |

注意：此统计口径代码已提交，但因 Docker build 阻塞，线上页面/API 尚未使用新口径。

## review_queue 旧重复清理

- 新增脚本：`npm -w web run review:dedupe`
- 生产清理已通过 postgres 容器内 SQL 执行
- 清理方式：
  - 保留信息最完整/较早的一条 pending
  - 其他重复项标记为 `ignored_duplicate`
  - 不物理删除
  - 合并 `occurrence_count / latest_payload / latest_error_message / last_seen_at / dedupe_key`
  - 写入 `review_audit_logs`
- 清理前 pending 重复组：117
- 清理前 pending 重复行：158
- 已标记 `ignored_duplicate`：158
- 清理后 pending 重复组：0
- 清理后 pending 重复行：0

## 后台审核流程加固

已提交但未上线：
- `/admin/review-queue` 默认 high impact 排序
- 支持排序：
  - occurrence_count desc
  - confidence desc / asc
  - created_at desc
  - last_seen_at desc
- 列表新增字段：
  - occurrence_count
  - dedupe_key
  - provider / canonical_provider
  - model
  - currency
  - region
  - source_url
  - confidence
  - last_seen_at
- 批量操作：
  - bulk ignore duplicates
  - bulk mark needs_more_info
  - bulk reject suspicious
- approve pricing 安全校验：
  - `currency_native` 必填
  - `region` 必填
  - `source_url` 必填
  - `input_price / output_price` 至少一个存在
  - `billing_unit` 必填
  - CNY 必须保留 native CNY
  - 同 model + currency + region + channel + selling_platform_provider 若存在不同 source pricing，默认拒绝并要求显式确认
  - approve 后写 `review_audit_logs`

## 当前生产验收

- `/`、`/models`、`/models/new`、`/providers`、`/rankings`、`/recommend`、`/compare`：200
- `/admin`、`/admin/review-queue`、`/admin/pricing-gaps`：未登录 307
- `/api/admin/review-queue`、`/api/admin/pricing-gaps`：未登录 401
- web / worker / postgres：正常
- 日志未发现：`500 / digest / relation does not exist / tsx not found / EACCES / password authentication failed / server-side exception`

## 下一步

1. 先修 Docker build/buildx 卡住问题，让 `ddd1e00` 正式 rebuild/up。
2. 不要用 `.next` 或 docker cp 热修上线本轮代码。
3. Docker build 恢复后验证：
   - `/admin/review-queue` 已登录 200
   - `/admin/pricing-gaps` 已登录 200
   - `/api/admin/pricing-gaps` 中 `moonshot` CNY pricing = 8
4. 暂停新价格源扩展，直到后台统计口径正式上线并验证。

---
# 最新状态更新：Docker build 修复，后台治理正式上线

更新时间：2026-06-14 22:22 UTC+8

## 当前代码与部署

- 最新 commit：`2c64635`
- GitHub：已 push
- 服务器源码：`~/aileida-plus = 2c64635`
- web 镜像：已正式 rebuild
- web 容器：已 `up -d web`
- worker 镜像：未 rebuild，本轮无 worker 代码依赖
- postgres volume：未动
- 未使用 `.next` / docker cp 热修

## Docker build 卡住根因

- Docker daemon、buildx、磁盘、内存均正常。
- build cache 曾清到 0，但 build 仍卡住，说明 cache 过大不是根因。
- Docker 日志显示卡点在 web Dockerfile 的：
  - `[7/10] RUN npm install --include=dev`
- web Dockerfile 之前没有复制 `package-lock.json`，并使用 `npm install`。
- 清空 cache 后需要重新解析 workspace dependency，安装阶段很慢且进度不明确。
- BuildKit 报 `only one connection allowed` / `context canceled` 是超时取消后的症状。

## 修复命令/改动

- 修改 `Dockerfile`：
  - `COPY package.json package-lock.json tsconfig.base.json ./`
  - `RUN npm ci --production=false`
- commit：`2c64635 fix: make web docker install deterministic`
- 已执行：
  - `docker builder prune -af`：只清 builder cache，未清 volume
  - `docker compose -f docker-compose.prod.yml build web --progress=plain`
  - `docker compose -f docker-compose.prod.yml up -d web`

## 上线验收

- 页面：
  - `/`：200
  - `/models`：200
  - `/models/new`：200
  - `/providers`：200
  - `/rankings`：200
  - `/recommend`：200
  - `/compare`：200
  - `/admin`：307
  - `/admin/review-queue`：307
  - `/admin/pricing-gaps`：307
  - `/admin/data-quality`：307
- API：
  - `/api/admin/review-queue` 未登录：401
  - `/api/admin/pricing-gaps` 未登录：401
  - 已登录 `/api/admin/review-queue?limit=3`：可用
  - 已登录 `/api/admin/pricing-gaps`：可用

## ddd1e00 后台加固上线确认

- `/admin/review-queue` 已显示：
  - high impact
  - Dedupe
  - Source
  - Last seen
  - confidence desc
  - Bulk ignore duplicates
  - Needs more info
  - Reject suspicious
- approve 必填校验已生效：
  - 缺 `currency_native` 的测试 review approve 返回 400
- `/api/admin/pricing-gaps`：
  - `moonshot`：models 43，CNY pricing 8，missing 35
  - `alibaba-cloud`：529 / 7 / 522
  - `deepseek`：33 / 6 / 27
  - `siliconflow`：34 / 6 / 28
- CNY pricing 总数：32
- pending duplicate groups：0
- pending duplicate rows：0

## 容器与日志

- `aileida-web`：Up，使用最新 web image
- `aileida-worker`：Up
- `aileida-postgres`：Healthy
- 日志未发现：
  - `500`
  - `digest`
  - `relation does not exist`
  - `tsx not found`
  - `EACCES`
  - `password authentication failed`
  - `server-side exception`
  - `rank(...).slice/map`

---
## 2026-06-14 国内 CNY 价格第三轮补全（进行中）

- 当前目标：只做国内原生人民币价格覆盖扩展，不处理 DNS / Nginx / HTTPS，不改 Docker build 链路，不硬卡 Chromium / Playwright。
- 本地源码基线：`277e26d`。
- 已实现代码改动：
  - 扩展 `apps/worker/src/sources/cn-cny-pricing.ts`。
  - 新增 MiniMax 官方 CNY 价格源：`https://platform.minimaxi.com/docs/guides/pricing-paygo`。
  - 新增 Zhipu/GLM 官方价格页静态 JS 解析源：`https://open.bigmodel.cn/pricing`。
  - 新增 Volcengine/Doubao 官方文档审计源：`https://www.volcengine.com/docs/82379/1544106`；当前只写 fetch log/snapshot，不把列顺序未确认的价格直接入正式 pricing。
  - 新增 ModelScope 官方文档审计源：`https://modelscope.cn/docs/model-service/API-Inference/intro`；未发现稳定 per-token CNY API 价表，不把免费额度当价格入库。
  - 扩展 SiliconFlow 静态解析范围：DeepSeek、Kimi、Zhipu/GLM、MiniMax、Qwen，保留 selling_platform_provider/source_provider 为 `siliconflow`。
  - 扩展 Aliyun Bailian 静态价格行：Qwen、DeepSeek、GLM、Kimi、MiniMax，保留 selling_platform_provider/source_provider 为 `aliyun-bailian`。
  - 在 `apps/worker/src/pipeline.ts` 注册新增 CNY 源，并补充 lowercase `minimax` provider metadata。
- 本地预检结果（未入生产库）：
  - `cn-cny-siliconflow`：19 pricing。
  - `cn-cny-aliyun-bailian`：37 pricing。
  - `cn-cny-minimax`：11 pricing。
  - `cn-cny-zhipu`：8 pricing。
  - `cn-cny-volcengine-doubao`：0 pricing，仅审计 snapshot。
  - `cn-cny-modelscope`：0 pricing，仅审计 snapshot。
- 本地验证：`npm run typecheck` 通过。
- 下一步：
  - commit/push。
  - 服务器同步代码，正式 rebuild/up worker。
  - 在服务器运行 `npm -w worker run crawl:cny-pricing` 或容器内等效命令。
  - 验证 CNY pricing 是否从 32 提升到 >= 60。
  - 验证 source_fetch_logs/source_snapshots、review_queue 去重、国内榜单/推荐、主要页面/API、日志关键错误。

### 生产部署与验收结果

- commit：`7e20a1e feat: expand domestic cny pricing sources`，已 push。
- 服务器源码：`7e20a1e`。
- 部署方式：
  - 服务器到 GitHub `git fetch` 一度卡住；已停止卡住进程。
  - 使用本地 git bundle 上传并在服务器 `git merge --ff-only FETCH_HEAD`，保持正式 git commit 状态。
  - 已正式 `docker compose -f docker-compose.prod.yml build worker --progress=plain`。
  - 已 `docker compose -f docker-compose.prod.yml up -d worker`。
  - 未重建 web，因为本轮只改 worker 抓取逻辑和文档。
- 已运行：`docker compose -f docker-compose.prod.yml exec -T worker npm -w worker run crawl:cny-pricing`。
- CNY pricing：
  - 入库前：32。
  - 入库后：94。
  - 按 owner：alibaba-cloud 19、zhipu 18、deepseek 18、minimax 17、moonshot 11、tencent-hunyuan 6、baidu 5。
  - 按 selling platform：aliyun-bailian 30、siliconflow 19、minimax 11、zhipu 8、moonshot 8、tencent-hunyuan 6、alibaba-cloud 5、baidu-qianfan 5、deepseek 2。
- 新增/扩展源：
  - MiniMax：成功入库 11。
  - Zhipu GLM：成功入库 8。
  - Aliyun Bailian：成功跑出 37，本轮显著扩充 Qwen/DeepSeek/GLM/Kimi/MiniMax 平台价。
  - SiliconFlow：成功跑出 19，本轮扩充 DeepSeek/Kimi/GLM/MiniMax/Qwen 平台价。
  - Volcengine/Doubao：官方文档抓取成功，写 source_fetch_logs/source_snapshots；价格列顺序仍需人工确认，未写正式 pricing。
  - ModelScope：官方文档抓取成功，写 source_fetch_logs/source_snapshots；未发现稳定 per-token CNY API 单价，未把免费额度当价格。
- source_fetch_logs：本轮 CNY 源均 success；Volcengine/ModelScope 为 0 pricing success。
- source_snapshots：10 个 CNY 源均有 snapshot。
- 国内榜单/API：
  - `/api/v1/rankings/domestic?limit=20`：200，Top20 中 18 个 CNY 标记。
  - `/api/v1/rankings/frontier-value?region=china_mainland&limit=20`：200，返回 12 条，其中 6 个 CNY 标记。
  - `/api/v1/recommend` 国内写作场景：200，`relaxedFilters=[]`，budget/balanced/premium 三组 Top5 均为 CNY，`pricingGapAlerts` 正常返回。
- 页面状态：
  - `/`、`/models`、`/models/new`、`/providers`、`/rankings`、`/recommend`、`/compare`：200。
  - `/admin`、`/admin/review-queue`、`/admin/pricing-gaps`：未登录 307。
  - `/api/admin/review-queue`、`/api/admin/pricing-gaps`：未登录 401。
- 容器状态：
  - `aileida-web` Up。
  - `aileida-worker` Up，已使用新 worker 镜像。
  - `aileida-postgres` healthy。
- 日志关键字：web/worker tail 检查未见 `500 / digest / relation does not exist / tsx not found / EACCES / password authentication failed / server-side exception / rank` 匹配输出。
- 注意：pending duplicate groups 查询为 1，不是用户提供的 0；本轮按要求不做 review_queue 清理，留给下一轮治理复核。
## 2026-06-14 public trust and SEO pre-launch pass

- Final deployment result:
  - Code commit: `2ae6d85 feat: improve public trust and seo`, pushed and deployed.
  - Server source: `2ae6d85`.
  - Web image formally rebuilt with Docker Compose; no `.next` hotfix and no `docker cp`.
  - Worker was not rebuilt; this round changed web/public UI and docs only.
  - Smoke pages: `/`, `/models`, `/models/new`, `/models/deepseek-chat`, `/models/kimi-k2.6`, `/models/ernie-5.1`, `/providers`, `/rankings`, `/rankings/domestic`, `/rankings/frontier-value`, `/recommend`, `/compare`, `/robots.txt`, `/sitemap.xml` all returned 200.
  - Admin pages unauthenticated: `/admin`, `/admin/review-queue`, `/admin/pricing-gaps` returned 307.
  - Admin APIs unauthenticated: `/api/admin/review-queue`, `/api/admin/pricing-gaps` returned 401.
  - Public APIs: domestic rankings, frontier-value rankings, frontier-value mainland rankings, and recommend all returned 200.
  - Recommend domestic writing smoke: `relaxedFilters=[]`, `pricingGapAlerts=5`, `latestModelAlerts=6`.
  - review_queue: `pending_null_dedupe=0`, `pending_duplicate_groups=0`.
  - Logs: no matches for `500`, `digest`, `relation does not exist`, `tsx not found`, `EACCES`, `password authentication failed`, `server-side exception`, or `rank(...).slice/map`.

- Scope: no DNS/Nginx/HTTPS, no Chromium/Playwright, no new pricing sources.
- First fixed the review_queue duplicate signal:
  - The reported `pending duplicate groups = 1` was caused by historical pending rows with `dedupe_key is null` being grouped together by a naive query.
  - Effective duplicate detection using the cleanup script key returned 0 real duplicate groups.
  - Production backfilled 896 missing pending `dedupe_key` values and wrote 896 `review_audit_logs` rows with action `backfill-dedupe-key`.
  - No rows were physically deleted.
  - After cleanup: `pending_null_dedupe = 0`, `pending_duplicate_groups = 0`.
- Public page trust updates:
  - Added `apps/web/components/price-trust.tsx`.
  - Updated model cards, ranking pages, model detail, compare, and recommend pages to show native CNY/USD, estimated currency markers, source links, confidence, channel type, and data quality flags.
  - Model detail now shows owner provider, selling platform provider, source provider, multi-channel pricing rows, update time, and alternatives.
  - Recommend results now show reasons, native/estimated price status, official/aggregator/domestic badges, stronger/cheaper alternatives, pricing gap alerts, and newer unpriced model alerts.
- Homepage and SEO:
  - Homepage repositioned around latest model discovery, domestic CNY ranking, global value ranking, price changes/new prices, and recommendation entry.
  - Added or refreshed metadata for homepage, models, rankings, compare, recommend, and model detail.
  - Added `robots.txt` and `sitemap.xml` route handlers.
- Local validation:
  - `npm run typecheck` passed.
  - `npm -w web run build` passed.
- Note:
  - Some high-traffic pages were rewritten with ASCII-safe copy during this pass because prior UTF-8 text in several TSX files was corrupted by Windows shell encoding. The trust/SEO features are in place; final Chinese microcopy can be restored later using a safer encoding workflow.

---
## 2026-06-15 P0 data freshness audit + homepage curated ranking repair

- Scope requested by `D:\Desktop\下一步.txt`: pause broad Chinese copy polish and UI redesign; fix public homepage data freshness and selected Top8 credibility first.
- Do not work on DNS/Nginx/HTTPS, Chromium/Playwright, new large pricing-source expansion, or commercialization.
- Code changes prepared locally:
  - `apps/web/lib/db/queries.ts`
    - Adds derived freshness fields to `ModelWithPricing`: `source_checked_at`, `pricing_checked_at`, `official_source_checked_at`, `freshness_status`, `source_age_hours`, `pricing_age_hours`, `model_age_days`.
    - Adds derived supersession fields: `has_newer_family_model`, `superseded_by_model_id`, `is_current_default_pick`.
    - Enriches models from `source_fetch_logs`, `model_discovery_logs`, and `latest_model_candidates`.
    - Adds `dataFreshnessOverview()` for homepage freshness cards.
  - `apps/web/lib/rank/score.ts`
    - Ranking defaults now support and return freshness/supersession metadata.
    - Adds `hide_stale`, `hide_superseded`, `max_source_age_hours`, and `homepageStrict` logic.
    - Homepage strict mode filters stale, superseded, legacy/previous/unknown, suspicious, manual-review, missing-source, and low-confidence candidates.
  - `apps/web/app/api/v1/rankings/[type]/route.ts`
    - API supports `max_source_age_hours`, `hide_stale`, `hide_superseded`.
    - API response now includes freshness fields and `why_ranked`.
  - `apps/web/app/api/v1/recommend/route.ts`
    - Default non-cheapest recommendation filters superseded models and stale data over 72h.
    - Recommendation model payload includes freshness/supersession fields.
  - `apps/web/app/page.tsx`
    - Homepage copy tightened into a more professional "API model pricing intelligence" positioning.
    - Homepage Top8 now uses current-main-model strict ranking with 12h freshness, max 2/provider and max 1/family.
    - Adds model discovery / pricing source / CNY pricing freshness cards.
  - `apps/worker/src/cli/audit-freshness.ts`
    - New `npm run audit:freshness` command for stale source/pricing audit.
  - `package.json` and `apps/worker/package.json`
    - Adds `audit:freshness`, `freshness:audit`, and `crawl:pricing` aliases.
- Local validation passed:
  - `npm run typecheck`
  - `npm -w web run build`
  - `npm -w worker run build`
- Local `npm run audit:freshness` starts correctly but cannot connect because local Postgres is not running at `127.0.0.1:5432`; run it in production worker/container after deploy.
- Current production before deploy:
  - Server source: `f9f4317`.
  - web/worker/postgres are up.
  - Existing homepage/API before fix showed stale/aggregator-ish selected cards even while latest source logs were fresh.
- Next required actions:
  1. Commit and push these changes.
  2. Sync server source.
  3. Formally rebuild web and worker images.
  4. Run `npm run audit:freshness` in the production worker context.
  5. Validate `/`, `/models`, `/models/new`, `/providers`, `/rankings`, `/recommend`, `/compare`, admin 307, admin API 401, and logs.

### Completed production result

- Code commits:
  - `cecb0c6 fix: enforce homepage freshness ranking`
  - `7bd0b39 fix: include latest candidates in freshness audit`
  - `decef06 fix: audit actual homepage freshness ranking`
- GitHub: pushed.
- Server source: `decef06`.
- Deployment:
  - Web image formally rebuilt and restarted for the homepage/ranking/recommendation changes.
  - Worker image formally rebuilt and restarted for `audit:freshness`.
  - No `.next` hotfix and no `docker cp`.
- Production `audit:freshness`:
  - Source freshness: 23 sources, `stale_over_12h=0`, `stale_over_24h=0`.
  - Latest source check: `2026-06-14 16:05:05 UTC`.
  - Latest pricing check: `2026-06-14 16:04:47 UTC`.
  - CNY pricing count: 94.
  - Homepage Top8 from ranking API: all `fresh`, all `current_frontier/current_mainstream`, all `has_newer_family_model=false`.
- Homepage Top8 after fix:
  1. `kimi-k2.7-code` / moonshotai / current_frontier / fresh
  2. `gemini-flash-latest` / google / current_mainstream / fresh
  3. `gemini-pro-latest` / google / current_mainstream / fresh
  4. `mimo-v2.5` / xiaomi / current_mainstream / fresh
  5. `minimax-m3` / minimax / current_mainstream / fresh
  6. `grok-4.20` / xai / current_mainstream / fresh
  7. `openrouter/xiaomi/mimo-v2.5` / openrouter / current_mainstream / fresh
  8. `claude-opus-4.8` / anthropic / current_mainstream / fresh
- Domestic ranking sample:
  - Top8 all `currency_native=CNY`, `region=china_mainland`, `freshness=fresh`.
- Recommend smoke:
  - Domestic Chinese writing returned `relaxedFilters=[]`.
  - Balanced Top5 were fresh, CNY-priced, and `hasNewerFamilyModel=false`.
- Page/API validation:
  - `/`, `/models`, `/models/new`, `/providers`, `/rankings`, `/rankings/domestic`, `/rankings/frontier-value`, `/recommend`, `/compare` returned 200.
  - `/admin`, `/admin/review-queue`, `/admin/pricing-gaps`, `/admin/data-quality` returned 307 unauthenticated.
  - `/api/v1/rankings/domestic?limit=20`, `/api/v1/rankings/frontier-value?limit=20`, `/api/v1/rankings/frontier-value?region=china_mainland&limit=20` returned 200.
  - `/api/admin/review-queue`, `/api/admin/pricing-gaps` returned 401 unauthenticated.
- Logs:
  - No matches for `500`, `digest`, `relation does not exist`, `tsx not found`, `EACCES`, `password authentication failed`, `server-side exception`, or `rank(...).slice/map`.
- Note:
  - `audit:freshness` also prints old pricing rows. Many historical/current pricing rows are older than 24h, but homepage/default Top8 is now guarded by recent source checks and stale/superseded filtering. Future work can split source freshness from per-price-row recrawl freshness more precisely.

---
## 2026-06-15 P0 official-current coverage audit + homepage Top8 currentness repair

- Scope requested by latest `D:\Desktop\下一步.txt`: stop broad Chinese copy/SEO/UI polish; fix the higher-level issue that homepage Top8 can still contain old or non-official-mainstream models even when `freshness_status=fresh`.
- Root cause found:
  - Previous `freshness_status` mixed source recrawl freshness with model-version currentness.
  - `current_mainstream` was too broad for homepage use; models could enter from capability/context/confidence or aggregator freshness without official current/recommended evidence.
  - Production pre-fix Top8 included `mimo-v2.5` and `openrouter/xiaomi/mimo-v2.5`, proving source freshness was being mistaken for official current model evidence.
- Code changes prepared locally:
  - `packages/pricing-core/src/official-current/index.ts`
    - Adds a minimal official current model catalog with provider, model slug, aliases, family, official source URL, status, confidence, and homepage eligibility.
    - Catalog is conservative and is used as evidence, not as a replacement for raw provider/source/pricing data.
  - `apps/web/lib/db/queries.ts`
    - Splits freshness into `source_freshness_status` and `model_recency_status`.
    - Adds `is_official_current`, `is_official_recommended`, `official_current_*`, and `official_current_catalog_match`.
    - Applies catalog evidence during model enrichment without overwriting owner/selling/source provider fields.
  - `apps/web/lib/rank/score.ts`
    - Homepage strict mode now requires fresh source data, current/recent model recency, no supersession, and optional official-current catalog evidence.
    - Ranking API now returns source freshness, model recency, and official-current evidence fields.
  - `apps/web/app/api/v1/rankings/[type]/route.ts`
    - Adds `homepage_strict` and `require_official_current` query params for reproducible audits.
  - `apps/web/app/page.tsx`
    - Homepage curated and domestic blocks now require official-current evidence in strict mode.
  - `apps/worker/src/cli/audit-official-current.ts`
    - Adds `npm run audit:official-current`.
    - Reports official current/recommended/latest model coverage, DB missing models, and missing pricing.
  - `apps/worker/src/cli/audit-homepage-currentness.ts`
    - Adds `npm run audit:homepage-currentness`.
    - Compares old-like homepage ranking with strict official-current homepage ranking and flags stale/unknown/superseded/missing-evidence rows.
  - `package.json` and `apps/worker/package.json`
    - Adds root and worker scripts for both new audits.
- Local validation passed:
  - `npm run typecheck`
  - `npm run build`
- Pending production steps:
  1. Commit and push.
  2. Sync server source.
  3. Formally rebuild web and worker images.
  4. Run `npm run audit:official-current` and `npm run audit:homepage-currentness` in the production worker container.
  5. Validate public pages/admin redirects/admin API auth/logs.

### Completed production result

- Code commits:
  - `cc752fa fix: require official current evidence for homepage`
  - `a0d9259 fix: tighten official current homepage audit`
  - `7a448fb fix: load official catalog in worker image`
- GitHub: pushed.
- Server source: `7a448fb`.
- Deployment:
  - Web image formally rebuilt/restarted for the homepage/ranking currentness change.
  - Worker image formally rebuilt/restarted for both new audit commands.
  - No `.next` hotfix and no `docker cp`.
- New audit commands:
  - `npm run audit:homepage-currentness` passed in production.
  - `npm run audit:official-current` passed in production.
- Homepage Top8 before strict official-current filter still included rows without official catalog evidence:
  - `mimo-v2.5`
  - `openrouter/xiaomi/mimo-v2.5`
  - `gpt-5-codex`
- Homepage strict Top8 after fix:
  1. `minimax-m3` / minimax / official current source
  2. `gemini-flash-latest` / google / official recommended source
  3. `kimi-k2.7-code` / moonshotai / official recommended source / CNY
  4. `grok-4.20` / xai / matched to official Grok 4 evidence
  5. `claude-opus-4.8` / anthropic / official recommended source
  6. `kimi-k2.6` / moonshotai / official current source / CNY
  7. `gemini-3.5-flash` / google / official recommended source
  8. `gpt-5.5` / openai / official recommended source
- `audit:homepage-currentness` result:
  - `all_official_current_or_recommended=true`
  - `previous_stale_unknown_count=0`
  - `missing_official_source_count=0`
  - `source_fresh_but_model_not_current_count=0`
  - `superseded_count=0`
  - `failing=[]`
- `audit:official-current` key gaps:
  - Missing official current/recommended models in DB: `llama-4-maverick`, `llama-4-scout`, `command-r-plus-08-2024`, `north-mini-code-1-0`, `doubao-seed-1.6`, `glm-4.6`.
  - Official current model in DB but without pricing: `mistral-medium-3.5`.
  - SiliconFlow is tracked as a selling-platform catalog, not a homepage model-owner pick.
- Page/API validation:
  - `/`, `/models`, `/models/new`, `/providers`, `/rankings`, `/rankings/domestic`, `/rankings/frontier-value`, `/recommend`, `/compare` returned 200.
  - `/admin`, `/admin/review-queue`, `/admin/pricing-gaps`, `/admin/data-quality` returned 307 unauthenticated.
  - `/api/v1/rankings/frontier-value?limit=8&homepage_strict=true&require_official_current=true` returned 200.
  - `/api/admin/review-queue`, `/api/admin/pricing-gaps` returned 401 unauthenticated.
- Containers:
  - `aileida-web`, `aileida-worker`, `aileida-postgres` are up; postgres healthy.
- Logs:
  - No matches for `500`, `digest`, `relation does not exist`, `tsx not found`, `EACCES`, `password authentication failed`, `server-side exception`, or `rank(...).slice/map`.
- Follow-up:
  - Do not fill homepage slots with old substitutes. Next discovery work should add missing official models to DB/review_queue and mark price pending when pricing is absent.

---
## 2026-06-15 System logic audit / architecture freeze

- Scope requested by latest `D:\Desktop\下一步.txt`: pause all new feature development, price-source expansion, Chinese copy, SEO, HTTPS, DNS, and UI redesign. Produce a clear architecture/data-flow audit so future work does not keep patching the wrong layer.
- Added docs:
  - `docs/SYSTEM_INVARIANTS.md`
  - `docs/SYSTEM_LOGIC_AUDIT.md`
- Production audit inputs:
  - Existing `npm run audit:homepage-currentness`
  - Existing `npm run audit:official-current`
  - Direct production SQL checks for stored lifecycle tiers, homepage named models, pricing source staleness, and current_mainstream distribution.
- Key findings:
  - Source freshness and model currentness are now split, but the legacy API field `freshness_status` still exists and can mislead future frontend work.
  - Stored `models.lifecycle_tier` is not the same as runtime enriched currentness. Many strict homepage models are stored as `unknown` and become current through catalog enrichment.
  - Stored `current_frontier` has 15 rows, many with `needs_pricing_review=true`.
  - Stored `current_mainstream` has 26 rows; all 26 currently have `needs_pricing_review=true` and no current pricing rows.
  - Pricing sources stale over 12h: 0.
  - Homepage strict Top8 currently passes the official-current audit, but alias/canonical cleanup is still needed for Gemini and Grok.
- Explicit architecture rules frozen:
  - Third-party aggregators cannot decide homepage official-current status alone.
  - Fallback catalog is candidate evidence, not live official truth.
  - Price rankings require prices.
  - Latest model discovery can show unpriced models as price pending.
  - Domestic RMB rankings must prioritize native CNY and label USD estimates.
  - Model owner, selling platform, and source provider must remain separate.
  - Homepage must not force-fill eight uncertain models.
- Recommended next engineering work:
  1. Add alias-level dedupe for catalog-equivalent models.
  2. Insert missing official-current models as price-pending candidates.
  3. Move official-current catalog governance from code to DB/admin workflow.
  4. Rename/deprecate ambiguous API fields such as `freshness_status`.

---

## 2026-06-15 official-current catalog stabilization phase 1

Scope lock: no DNS/Nginx/HTTPS, no Chinese copy/SEO, no new price source expansion, no UI redesign, no commercial features.

Completed locally:
- Removed fuzzy model-family fallback from official-current matching; explicit alias grok-4.20 -> grok-4-0709.
- Added DB catalog tables to schema/migration: official_current_models, official_model_aliases, official_catalog_runs.
- Web now prefers DB official-current catalog and marks code catalog as code-fallback.
- Ranking diversity dedupe now prefers official_current_model_slug, preventing latest alias/concrete version duplicates on homepage.
- API keeps freshness_status for compatibility and adds deprecation marker; frontend/recommend filtering now uses source_freshness_status + model_recency_status.
- Added worker command: npm run sync:official-current.
- Added read-only admin page: /admin/official-current; enhanced /admin/model-aliases.
- Added audit:freshness-fields and strengthened audit:homepage-currentness / audit:official-current.

Local validation:
- npm -w @pricing/core run typecheck: passed.
- npm -w web run typecheck: passed.
- npm -w worker run typecheck: passed.
- npm run audit:freshness-fields: passed.
- npm run build: passed.
- npm -w worker run build: passed.
- Local npm run db:migrate failed only because local PostgreSQL was not listening on 127.0.0.1:5432.

Production TODO for this round:
1. Commit/push this change.
2. On server: git pull, npm run db:migrate, npm run sync:official-current.
3. Formally rebuild web and worker images.
4. Validate /admin/official-current and /admin/model-aliases unauthenticated 307.
5. Run npm run audit:homepage-currentness, npm run audit:official-current, npm run audit:freshness-fields.
6. Smoke test public pages, admin APIs, and logs.

---

## 2026-06-15 official-current catalog stabilization phase 1 - production complete

Code commit deployed: `4fc15ee fix: stabilize official current catalog`.

Production actions:
- Pulled server source to `4fc15ee`.
- Rebuilt web and worker images formally with Docker compose.
- Ran migration inside compose web container.
- Ran `npm run sync:official-current` inside compose worker container.
- Restarted web and worker with the new images.

Production DB results:
- `official_current_models`: 27
- `official_model_aliases`: 54
- `official_catalog_runs`: 1
- `latest_model_candidates` from `official-current-catalog`: 27
- pending official-current reviews: 7
  - `official-current-model-missing`: 6
  - `official-current-price-missing`: 1
- pending duplicate groups: 0

Alias results:
- Gemini latest aliases now resolve to one canonical representative per official family.
- Grok aliases now explicitly map `grok-4.20` / `grok-4-latest` to `grok-4-0709`.
- Ambiguous Gemini/Grok broad aliases are marked `needs_alias_review=true` and `homepage_eligible=false`.

Validation:
- Public pages `/`, `/models`, `/models/new`, `/providers`, `/rankings`, `/rankings/frontier-value`, `/recommend`, `/compare`: 200.
- Admin pages `/admin`, `/admin/official-current`, `/admin/model-aliases`, `/admin/review-queue`, `/admin/pricing-gaps`: unauthenticated 307.
- Admin APIs `/api/admin/review-queue`, `/api/admin/pricing-gaps`: unauthenticated 401.
- Production audits passed: `audit:homepage-currentness`, `audit:official-current`, `audit:freshness-fields`.
- Logs clean for critical patterns: no 500/digest/relation/tsx/EACCES/password/server-side exception/rank errors.

Important operational note:
- Host-level migration with guessed env failed because host env did not match compose DB auth/Docker DNS. Final successful path is compose-run container execution:
  - `docker compose -f docker-compose.prod.yml run --rm web npm run db:migrate`
  - `docker compose -f docker-compose.prod.yml run --rm worker npm run sync:official-current`
