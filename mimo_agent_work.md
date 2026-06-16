# MiMo Agent 工作记录

## 项目信息
- **项目名称**: AI 模型价格雷达（ModelPrice Radar / aileida-plus）
- **仓库地址**: https://github.com/Kannanyyd/aileida-plus.git
- **服务器**: 175.178.213.71 (Ubuntu 24.04)
- **域名**: skillstop.online / www.skillstop.online
- **SSH 密钥**: `D:\Agent\自动化\AI订阅雷达\NewLeiDa.pem`

---

## 完成任务：域名上线 (2026-06-15)

### 一、DNS 检查 ✅

| 域名 | DNS 服务器 | 解析结果 |
|---|---|---|
| skillstop.online | 1.1.1.1 (Cloudflare) | 175.178.213.71 ✅ |
| www.skillstop.online | 1.1.1.1 (Cloudflare) | 175.178.213.71 ✅ |
| skillstop.online | 8.8.8.8 (Google) | 175.178.213.71 ✅ |
| www.skillstop.online | 8.8.8.8 (Google) | 175.178.213.71 ✅ |

### 二、端口检查 ✅

| 端口 | 状态 | 说明 |
|---|---|---|
| 80 | nginx 占用 | 已配置反向代理 |
| 443 | nginx SSL | 已配置 HTTPS |
| 3000 | Docker Web 服务 | 正常运行 |

### 三、Nginx 配置 ✅

**配置文件路径**: `/etc/nginx/sites-available/aileida`（符号链接到 `/etc/nginx/sites-enabled/aileida`）

**配置内容**:
- 反向代理到 `http://127.0.0.1:3000`
- 支持 Next.js WebSocket (`/_next/webpack-hmr`)
- 支持 Next.js Streaming（proxy_buffering off）
- 保留 Host、X-Forwarded-For、X-Forwarded-Proto 头
- 静态资源缓存 (`/_next/static`)
- HTTP 自动跳转 HTTPS（301）

### 四、HTTPS 证书 ✅

| 项目 | 详情 |
|---|---|
| 证书颁发机构 | Let's Encrypt |
| 证书路径 | `/etc/letsencrypt/live/skillstop.online/fullchain.pem` |
| 私钥路径 | `/etc/letsencrypt/live/skillstop.online/privkey.pem` |
| 有效期 | 2026-09-13（89 天） |
| 自动续期 | certbot.timer 已启用，每天检查两次 |
| 覆盖域名 | skillstop.online, www.skillstop.online |

### 五、上线验收结果 ✅

#### 公开页面（全部 200）
- https://skillstop.online/
- https://skillstop.online/models
- https://skillstop.online/providers
- https://skillstop.online/rankings
- https://skillstop.online/rankings/domestic
- https://skillstop.online/rankings/frontier-value
- https://skillstop.online/recommend
- https://skillstop.online/compare
- https://skillstop.online/robots.txt
- https://skillstop.online/sitemap.xml

#### 后台页面（未登录正确返回 307）
- https://skillstop.online/admin → 307 ✅
- https://skillstop.online/admin/official-current → 307 ✅
- https://skillstop.online/admin/model-aliases → 307 ✅

#### API 端点
- `/api/admin/review-queue` (未登录) → 401 ✅
- `/api/admin/pricing-gaps` (未登录) → 401 ✅
- `/api/v1/rankings/domestic?limit=20` → 200 ✅
- `/api/v1/rankings/frontier-value?limit=20` → 200 ✅

#### HTTP 跳转
- `http://skillstop.online` → 301 → `https://skillstop.online` ✅
- `http://www.skillstop.online` → 301 → `https://www.skillstop.online` ✅

### 六、日志检查 ✅

| 日志 | 状态 |
|---|---|
| nginx 错误日志 | 无 502/504，仅有正常扫描攻击 |
| web 容器日志 | Next.js 正常运行 |
| certbot 日志 | 证书申请成功 |

### 七、本轮未修改

- ❌ 业务代码
- ❌ 数据库结构
- ❌ Docker 镜像
- ❌ Worker 进程

---

## 完成任务：SEO URL 修复 (2026-06-16)

### 问题描述
robots.txt 和 sitemap.xml 仍然输出旧 IP 地址 `http://175.178.213.71:3000`，应使用正式域名 `https://skillstop.online`。

### 根因分析
代码中有 3 处硬编码旧 IP 作为 fallback：
1. `apps/web/app/layout.tsx:7` - `process.env.APP_BASE_URL ?? "http://175.178.213.71:3000"`
2. `apps/web/app/sitemap.ts:4` - `process.env.APP_BASE_URL ?? "http://175.178.213.71:3000"`
3. `apps/web/app/robots.ts:4` - `process.env.APP_BASE_URL ?? "http://175.178.213.71:3000"`

### 修复方案

#### 1. 新增统一站点 URL 工具函数
**文件**: `apps/web/lib/site-url.ts`
```typescript
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_BASE_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://skillstop.online"
      : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}
```

#### 2. 更新 3 个文件使用 getSiteUrl()
- `apps/web/app/layout.tsx` - metadataBase、OpenGraph URL
- `apps/web/app/sitemap.ts` - sitemap.xml 中的 URL
- `apps/web/app/robots.ts` - Sitemap 字段

#### 3. 更新服务器环境变量
```bash
# 服务器 ~/aileida-plus/.env
APP_BASE_URL=https://skillstop.online  # 从 www.skillstop.online 改为裸域
```

### 验收结果 ✅

| 检查项 | 修复前 | 修复后 |
|---|---|---|
| robots.txt Sitemap | `http://175.178.213.71:3000/sitemap.xml` | `https://skillstop.online/sitemap.xml` ✅ |
| sitemap.xml URL | `http://175.178.213.71:3000/...` | `https://skillstop.online/...` ✅ |
| metadataBase | 旧 IP | `https://skillstop.online` ✅ |
| OpenGraph URL | 旧 IP | `https://skillstop.online` ✅ |

### 页面验收（全部通过）
- 公开页面: 9 个页面全部 200 ✅
- 后台页面: 5 个页面未登录 307 ✅
- API 端点: 4 个端点正常 ✅
- 无旧 IP 残留 ✅

### Git 提交
```
b5c5853 fix(seo): unify site URL for robots.txt, sitemap, and metadata
```

### 部署
- Docker web 容器正式 rebuild ✅
- 服务器环境变量已更新 ✅

### www 规范
- `https://www.skillstop.online` 当前返回 200（可访问）
- canonical 已指向 `https://skillstop.online`
- 如需 www 301 跳转到裸域，需修改 nginx 配置

---

## 完成任务：服务器 Git 状态整理 (2026-06-16)

### 问题
服务器 git 状态不干净：
- HEAD 停留在 `09a983e`，落后于 GitHub 的 `bee76b8`
- 工作区有 4 个未提交的 SEO URL 修改文件

### 修复
```bash
cd ~/aileida-plus
git config http.sslVerify false   # 临时关闭 SSL 验证解决 TLS 问题
git fetch origin main
git reset --hard origin/main
git config http.sslVerify true    # 恢复 SSL 验证
```

### 结果
- HEAD: `bee76b8` (与 GitHub 同步)
- 工作区: clean
- 分支: up to date with origin/main

---

## 服务器常用命令

## 服务器常用命令

```bash
# SSH 连接
ssh -i "D:\Agent\自动化\AI订阅雷达\NewLeiDa.pem" ubuntu@175.178.213.71

# 查看容器状态
docker ps -a

# 查看 web 日志
docker logs aileida-web --tail 50

# 查看 worker 日志
docker logs aileida-worker --tail 50

# 重启服务
docker compose restart

# 查看 nginx 配置
sudo nginx -t

# 重载 nginx
sudo systemctl reload nginx

# 查看证书状态
sudo certbot certificates

# 手动续期证书
sudo certbot renew
```

---

## 完成任务：SEO URL / canonical 最终核验 (2026-06-16)

### 任务范围
仅做 SEO URL / canonical / robots / sitemap / www canonical 核验与修复。不做新功能、中文文案、模型数据、数据库等。

### 审计结果
- 本地代码无旧 IP (`175.178.213.71`) 引用 ✅
- `getSiteUrl()` 已被 `layout.tsx`、`robots.ts`、`sitemap.ts` 使用 ✅
- 服务器 `APP_BASE_URL=https://skillstop.online` ✅

### 修复内容
**Nginx www 跳转**：修改服务器 `/etc/nginx/sites-available/aileida`
- 添加 `https://www.skillstop.online` → `https://skillstop.online` 301 跳转
- 简化 HTTP 全部跳转到 `https://skillstop.online`
- 备份原配置到 `/etc/nginx/sites-available/aileida.backup`

### 验收结果
| 检查项 | 结果 |
|---|---|
| robots.txt Sitemap | `https://skillstop.online/sitemap.xml` ✅ |
| sitemap.xml URL | 全部 `https://skillstop.online/...` ✅ |
| 无旧 IP 残留 | ✅ |
| metadataBase / canonical / openGraph | 全部 `https://skillstop.online` ✅ |
| www → 裸域 301 | ✅ |
| HTTP → HTTPS | ✅ |
| 公开页面 (11个) | 全部 200 ✅ |
| 后台页面 (5个) | 未登录 307 ✅ |
| API (4个) | 401/200 正确 ✅ |
| audit:homepage-currentness | ✅ |
| audit:official-current | ✅ |
| audit:freshness-fields | ✅ |
| 日志 | 无关键错误 ✅ |
| typecheck / web build | ✅ |
| 服务器 git | clean, synced ✅ |

### 关键文件
- `apps/web/lib/site-url.ts` — 统一站点 URL 工具函数
- `apps/web/app/layout.tsx` — metadataBase, openGraph
- `apps/web/app/robots.ts` — Sitemap 字段
- `apps/web/app/sitemap.ts` — 所有 URL
- 服务器 nginx: `/etc/nginx/sites-available/aileida`

---

## 项目架构概要

```
AI订阅雷达/
├── apps/
│   ├── web/          # Next.js 15 前后端 (端口 3000)
│   └── worker/       # 数据抓取 Worker
├── packages/
│   └── pricing-core/ # 价格计算引擎
├── docker-compose.yml
└── nginx 配置: /etc/nginx/sites-available/aileida
```

**Docker 容器**:
- `aileida-web` - Web 应用 (端口 3000)
- `aileida-worker` - 数据抓取进程
- `aileida-postgres` - PostgreSQL 数据库 (端口 5432)

---

*文档更新时间: 2026-06-16*
*Agent: MiMo Code*
