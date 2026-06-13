# AI 模型价格雷达项目进度与待办报告

> 最后更新：2026-06-14 00:44 UTC+8
> 服务器：175.178.213.71 | GitHub：Kannanyyd/aileida-plus

---

## 1. 项目定位

本项目定位为 **AI 模型价格监控 + 多源对比 + 成本选型决策工具**，不是普通 AI 导航站。

核心能力：
- 实时追踪国内外主流 AI 模型 API 价格（LiteLLM / OpenRouter / llm-prices / genai-prices / 国内厂商）
- 同一模型多渠道价格对比（官方 API / 聚合平台 / 云平台 / 国内平台）
- 价格变化监控（price_change_log）
- 多维度排行榜（12 个预设榜单 + 精选/全量双模式）
- AI 模型推荐助手（含场景化推荐）
- 厂商/模型数据库（153 厂商 / 3881 模型）
- 抓取日志追踪（source_fetch_logs / source_snapshots）
- 人工复核队列（review_queue）

---

## 2. 当前总体状态

| 维度 | 状态 |
|---|---|
| 服务器 | ✅ 运行中（175.178.213.71:3000） |
| Web 容器 | ✅ Up，HTTP 200 |
| Worker 容器 | ✅ Up，每小时自动抓取 |
| PostgreSQL | ✅ Healthy，19 张表 |
| GitHub | ⚠️ 9 个 commits 未 push（本地 `b585d1f` vs 远程 `fef4125`） |
| 域名/HTTPS | ❌ 未配置 |
| 国内 SPA 抓取 | ⚠️ Playwright 不可用，HTTP fallback 无法提取价格 |
| Docker 镜像重建 | ❌ Docker Hub 国内不可达 |

---

## 3. 已完成模块

### 3.1 前端页面

| 页面 | 路由 | 状态 | 数据来源 |
|---|---|---|---|
| 首页 | `/` | ✅ 200 | 真实 DB |
| 模型库 | `/models` | ✅ 200 | 真实 DB（3881 条） |
| 模型详情 | `/models/[slug]` | ✅ 200 | 真实 DB + 多渠道价格表 |
| 厂商列表 | `/providers` | ✅ 200 | 真实 DB（153 家） |
| 厂商详情 | `/providers/[slug]` | ✅ | 真实 DB |
| 排行榜总览 | `/rankings` | ✅ 200 | 真实 DB（12 榜单入口） |
| 排行榜详情 | `/rankings/[type]` | ✅ 200 | 真实 DB + 精选/全量切换 |
| 推荐助手 | `/recommend` | ✅ | 真实 DB |
| 模型对比 | `/compare` | ✅ 200 | 真实 DB + API |
| 后台管理 | `/admin` | ✅ | 真实 DB |
| 后台登录 | `/admin-login` | ✅ | 密码鉴权 |
| AI 新闻 | `/ai-news` | ✅ | 真实 DB |
| 订阅方案 | `/plans` | ✅ | 真实 DB |
| 价格计算器 | `/calculate` | ✅ | 真实 DB |

### 3.2 后端 API

| 接口 | 状态 | 说明 |
|---|---|---|
| `/api/v1/models` | ✅ | 模型列表，支持 limit/query |
| `/api/v1/models/[slug]` | ✅ | 模型详情 |
| `/api/v1/models/[slug]/pricing` | ✅ | **多渠道价格**（新增） |
| `/api/v1/providers` | ✅ | 厂商列表 |
| `/api/v1/rankings/[type]` | ✅ v2 | 支持 diversity_mode, limit, offset, max_per_provider 等 |
| `/api/v1/recommend` | ✅ | 推荐助手 |
| `/api/v1/calculate` | ✅ | 价格计算 |
| `/api/v1/promotions` | ✅ | 优惠列表 |
| `/api/v1/reviews` | ✅ | 用户点评 |

**所有 API 均读取真实数据库，无 mock 数据。**

### 3.3 数据库（19 张表）

| 表 | 用途 | 数据量 |
|---|---|---|
| providers | AI 厂商 | 153 |
| models | AI 模型 | 3881 |
| pricing | API 价格（**支持多渠道/区域**） | 3371 |
| price_change_log | 价格变化记录 | 821 |
| promotions | 优惠/活动 | 56 |
| source_fetch_logs | 抓取日志 | 277 |
| source_snapshots | 抓取快照 | 208 |
| review_queue | 人工复核队列 | 709（已去重） |
| subscription_plans | 订阅方案 | 有 |
| product_offerings | 产品服务 | 有 |
| news_sources / news_items / news_events | 新闻动态 | 有 |
| scraper_jobs | 抓取任务 | 有 |
| fx_rates | 汇率 | 有 |
| model_strengths | 模型擅长方向 | 有 |
| user_reviews | 用户点评 | 有 |

**pricing 表已支持字段**：platform, is_official, is_aggregator, is_domestic, region（global/overseas/china_mainland）, channel（official_api/aggregator/cloud_platform）

### 3.4 抓取系统

| 源 | 成功数 | 状态 | 说明 |
|---|---|---|---|
| **LiteLLM** | 83 厂商 / 2330 模型 / 2330 价格 | ✅ | 主要数据源 |
| **OpenRouter** | 57 厂商 / 333 模型 / 299 价格 | ✅ | 聚合平台数据 |
| **llm-prices** | 10 厂商 / 117 模型 / 58 价格 | ✅ | URL 已修复 |
| **genai-prices** | 33 厂商 / 1088 模型 / 684 价格 | ✅ | URL 已修复 |
| 阿里云百炼 | 1 厂商 / 50 模型 / 0 价格 | ⚠️ SPA |
| 火山方舟 | 0/0/0 | ❌ SPA shell |
| 腾讯混元 | 1/4/0 | ⚠️ 静态 HTML |
| 百度千帆 | 1/4/0 | ⚠️ 静态 HTML |
| 智谱 GLM | 0/0/0 | ❌ SPA |
| 月之暗面 Kimi | 0/0/0 | ❌ SPA |
| DeepSeek | 0/0/0 | ⚠️ docs 无表格 |
| MiniMax | 0/0/0 | ❌ SPA |
| 硅基流动 | 1/5/0 | ⚠️ 部分 |

### 3.5 Worker

- ✅ 启动后 5 秒执行首次全量抓取
- ✅ 每小时 cron 自动抓取（`0 * * * *`）
- ✅ 手动命令：`npm run crawl:once` / `scrape:all` / `scrape:litellm` 等
- ✅ 抓取日志写入 source_fetch_logs（成功/失败 + 耗时 + error_message）
- ✅ 成功响应写入 source_snapshots
- ✅ 失败不静默（写入 error_message）

### 3.6 部署

| 项目 | 状态 |
|---|---|
| 服务器 | 175.178.213.71 (Ubuntu 24.04) |
| Docker | ✅ 29.5.3 |
| PostgreSQL | ✅ 16-alpine, Healthy |
| Web 容器 | ✅ aileida-web (Next.js 15) |
| Worker 容器 | ✅ aileida-worker |
| 端口 | 3000 |
| Nginx | ⚠️ 已安装但配置不完整（端口 80 可直连） |
| HTTPS | ❌ 未配置 |
| 域名 | ❌ skillstop.online DNS 指向错误 IP（198.18.0.219） |

---

## 4. 最近修复的问题

| # | 问题 | 根因 | 修复方式 | 状态 |
|---|---|---|---|---|
| 1 | PostgreSQL 密码错误 | .env 未加载 | docker compose --env-file | ✅ |
| 2 | relation does not exist | 迁移未执行 | `npm run db:migrate` | ✅ |
| 3 | tsx: not found | tsx 在 devDeps | 移到 dependencies | ✅ |
| 4 | EACCES 权限 | 容器内 npm install | 改为 Dockerfile 预装 | ✅ |
| 5 | llm-prices 404 | URL 错误（simonw/llm-prices 不存在） | 改用 llm-prices.com/current-v1.json | ✅ |
| 6 | genai-prices 404 | URL 路径变更 | 改用 data_slim.json + data.json fallback | ✅ |
| 7 | worker 静默失败 | 无 fetch log 记录 | 新增 fetch-log.ts 模块 | ✅ |
| 8 | source_snapshots 仅 4 条 | 仅 JSON 源有快照 | 所有源生成 summary snapshot | ✅ |
| 9 | review_queue 5621 条爆炸 | 无去重 | 按 model_id + reason 去重 → 709 | ✅ |
| 10 | price_change_log 误报 | 多源差异被当成价格变化 | diff 逻辑：不同 source → conflict | ✅ |
| 11 | Playwright 安装卡死 | `npx playwright install chromium` 下载超时 | 代码级降级 HTTP + Dockerfile 用系统 Chromium（Docker Hub 仍不可达） | ⚠️ |
| 12 | 国内 SPA 抓取 0 结果 | Playwright 不可用 + SPA 无内容 | HTTP fetchText 降级 + SPA shell 检测 | ⚠️ |
| 13 | DNS 指向 198.18.0.219 | DNS 记录错误 | 待用户配置 | ❌ |
| 14 | onClick SSR error digest | Server Component 传递 onClick | model-card.tsx 加 "use client" | ✅ |
| 15 | model-card 渲染错误 | 同上 | 同上 | ✅ |

---

## 5. 当前遗留问题

| # | 问题 | 严重度 | 说明 |
|---|---|---|---|
| 1 | **GitHub 未 push** | 🔴 P0 | 9 个 commits 仅在本地（`b585d1f` 领先远程 `fef4125`），代码丢失风险 |
| 2 | **国内 scraper 无价格** | 🔴 P0 | 9 家国内厂商仅抓到 63 个模型名，0 条价格 |
| 3 | **Playwright / Chromium 不可用** | 🔴 P0 | Docker Hub 国内不可达，无法构建含 Chromium 的镜像 |
| 4 | **pricing region 未区分国内/海外** | 🟡 P0 | backfill 未正确区分 LiteLLM 中的国内厂商（region 全为 "global"） |
| 5 | **排行榜默认展示旧模型** | 🟡 P1 | 未执行 status="active" 的严格过滤 |
| 6 | **推荐助手未区分新旧模型** | 🟡 P1 | 按纯分数排序，可能推荐旧模型 |
| 7 | **域名未配置** | 🟢 P2 | skillstop.online DNS 指向错误 |
| 8 | **HTTPS 未配置** | 🟢 P2 | 无证书 |
| 9 | **review_queue 缺少后台管理 UI** | 🟡 P1 | 只有 SQL 查询，无页面操作 |
| 10 | **同一模型多渠道价格未在榜单合并** | 🟡 P1 | 榜单取当前 is_current=true 的第一条，未合并展示 |
| 11 | **推荐助手无区域/渠道筛选** | 🟡 P1 | 推荐结果不区分国内可用/海外官方 |
| 12 | **部分 API 无分页** | 🟢 P2 | /models/ 在单页加载所有模型 |
| 13 | **SEO 不完整** | 🟢 P2 | 缺少 sitemap、canonical、OG tags |
| 14 | **数据库无备份** | 🟡 P1 | 无自动备份策略 |

---

## 6. 待办事项

### P0 — 必须立即处理

- [ ] **GitHub push**：`git push origin main`（9 commits 待推送）
- [ ] **确认无敏感文件**：检查 .env / .pem / token 不在 Git 跟踪中
- [ ] **pricing region 区分**：backfill LiteLLM 国内厂商 → region=china_mainland
- [ ] **固定 Docker 镜像源**：配置可用的 Docker Hub 国内镜像
- [ ] **构建含 Chromium 的 worker**：完成国内 SPA 页面抓取
- [ ] **确认 worker 自动抓取稳定**：连续 24h 无崩溃

### P1 — 核心产品体验

- [ ] **国内 9 家 scraper 完善**：Playwright 可用后逐家修复 CSS 选择器
- [ ] **榜单模型新旧分层**：current_frontier / current_mainstream / legacy / deprecated
- [ ] **推荐助手区域筛选**：国内可用 / 海外官方 / 聚合平台
- [ ] **排行榜多渠道合并**：同一模型默认显示一条，展开见多渠道价格
- [ ] **review_queue 后台管理页**：按厂商/来源/类型筛选 + 批量操作
- [ ] **review_queue 去重保障**：确认 P0 修复的 dedup 在生产中生效
- [ ] **厂商详情页补充介绍**：从 scraping 获取或手动编辑
- [ ] **推荐助手输出推荐理由**：展示为什么推荐某模型
- [ ] **排行榜筛选器完善**：厂商、家族、币种、上下文长度
- [ ] **数据库备份策略**：每日 pg_dump + 异地存储

### P2 — 上线前完善

- [ ] **Nginx 配置**：反向代理 3000 → 80/443
- [ ] **HTTPS**：Let's Encrypt 证书
- [ ] **域名 DNS**：www.skillstop.online → 175.178.213.71
- [ ] **sitemap.xml + robots.txt**
- [ ] **SEO metadata**：canonical, OG, structured data
- [ ] **404/500 错误页面**
- [ ] **后台登录安全**：rate limiting, session management
- [ ] **API 限流**：防止滥用
- [ ] **日志清理**：cron 清理旧 source_fetch_logs/snapshots
- [ ] **价格变化趋势图**：price_change_log 可视化

### P3 — 后续商业化

- [ ] 用户账号系统
- [ ] 收藏/对比列表
- [ ] 价格变动邮件/微信通知
- [ ] Pro 会员
- [ ] API 数据订阅
- [ ] 推广链接
- [ ] 数据导出（CSV/JSON）
- [ ] 企业定制报告

---

## 7. 产品方向校准

**核心原则（不可偏离）**：

1. ❌ 不是普通 AI 导航站 → ✅ 是价格监控 + 模型选型 + 成本决策工具
2. ❌ 不是只按价格从低到高排序 → ✅ 综合评分：价格 + 能力 + 上下文 + 稳定性 + 可信度
3. ❌ 不推荐旧模型作为默认 → ✅ 默认榜单优先当前主流/前沿模型
4. ❌ 不把老模型混入主流推荐 → ✅ 老模型只进"旧模型低价榜"
5. ❌ 同名模型不覆盖 → ✅ 同一模型保留多渠道/区域价格
6. ❌ 榜单不只有 Top 10 → ✅ 支持 Top 20/50/100
7. ❌ 榜单不刷屏 → ✅ 精选榜同厂商 ≤5、同家族 ≤3
8. ❌ 推荐无理由 → ✅ 每条推荐带排名理由
9. ❌ 价格无溯源 → ✅ 所有价格有 source_url + 更新时间 + 币种 + 可信度
10. ❌ 国内未完成不假装 → ✅ 未完成进 review_queue，标记 need_manual_review
11. ❌ 不用 mock 数据 → ✅ 全站读取真实 DB
12. ❌ 不覆盖 diff → ✅ 多源价格冲突进 review_queue

---

## 8. 当前验收数据

### 数据库

| 表 | 数量 |
|---|---|
| providers | 153 |
| models | 3881 |
| pricing | 3371 |
| price_change_log | 821 |
| promotions | 56 |
| source_fetch_logs | 277 |
| source_snapshots | 208 |
| review_queue | 709（去重后） |

### 抓取源

| 源 | 厂商 | 模型 | 价格 |
|---|---|---|---|
| LiteLLM | 83 | 2330 | 2330 |
| OpenRouter | 57 | 333 | 299 |
| llm-prices | 10 | 117 | 58 |
| genai-prices | 33 | 1088 | 684 |
| 国内 9 家合计 | 5 | 63 | 0 |

### HTTP 状态

| 页面 | 状态 |
|---|---|
| `/` | 200 |
| `/models` | 200 |
| `/providers` | 200 |
| `/models/[slug]` | 200 |
| `/rankings` | 200 |
| `/rankings/[type]` | 200 |
| `/compare` | 200 |
| `/recommend` | 200 |
| `/admin` | 200 |

### 容器

| 容器 | 状态 |
|---|---|
| aileida-web | Up |
| aileida-worker | Up |
| aileida-postgres | Up (healthy) |

### GitHub

| 项目 | 状态 |
|---|---|
| 远程 HEAD | fef4125 |
| 本地 HEAD | b585d1f |
| 领先 commits | 9 |
| 待 push | ⚠️ |

---

## 9. 风险与建议

| 风险 | 影响 | 建议 |
|---|---|---|
| GitHub 未 push | 代码丢失 | **立即 push** |
| 密钥泄露 | 安全事件 | 确认 .gitignore 覆盖 .env/.pem/.key |
| Docker Hub 不可达 | 无法重建镜像 | 配置稳定镜像代理或使用国内 Registry |
| 国内 SPA 抓取失败 | 价格数据缺失 | Playwright Chromium 必须可用 |
| 多源价格冲突 | 数据不准确 | review_queue 治理 + 人工确认 |
| 模型新旧识别不准 | 推荐质量差 | 实现 status 分层 + 发布日期判断 |
| review_queue 再次膨胀 | DB 压力 | P0 去重已生效，定期监控 |
| 域名/HTTPS 未完成 | 无法正式上线 | P2 优先级 |
| 无数据库备份 | 数据丢失 | 每日 pg_dump 脚本 |

---

## 10. 下一步执行顺序（Top 10）

1. **GitHub push**：`git push origin main`
2. **确认敏感文件排除**：检查 .gitignore
3. **pricing region backfill**：UPDATE pricing SET region='china_mainland' WHERE provider 为国内厂商
4. **Docker 镜像源修复**：配置可用 proxy 拉取 node:22-slim
5. **构建 Chromium worker**：Dockerfile.worker 使用 node:22-slim + chromium
6. **运行国内 scraper**：Playwright 可用后立即抓取价格
7. **review_queue 后台 UI**：管理页面支持筛选和批量操作
8. **榜单旧模型过滤**：确保默认榜单 status="active"
9. **推荐助手区域筛选**：国内可用 / 海外官方 / 聚合平台
10. **Nginx + 域名 + HTTPS**：正式上线

---

> **报告生成时间**：2026-06-14 00:44 UTC+8
> **服务器地址**：http://175.178.213.71:3000
> **GitHub**：https://github.com/Kannanyyd/aileida-plus
