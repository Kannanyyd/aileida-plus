# 热修风险文档

## 当前状态（2026-06-14 接管审计后）

已完成正式部署修复：

- 服务器目录 `~/aileida-plus` 已从 tar 包目录转换为 Git 工作区。
- 当前服务器 commit：`6923555`。
- `docker compose -f docker-compose.prod.yml build web --progress=plain` 已成功。
- `docker compose -f docker-compose.prod.yml up -d web` 已成功。
- 当前 web 容器运行的是正式重建镜像，不再依赖 `docker cp .next` 热修注入。
- `/`、`/models`、`/providers`、`/rankings`、`/rankings/frontier-value`、`/recommend`、`/compare` 均返回 200；`/admin` 返回 307 登录重定向。

历史问题：Docker Hub 曾经在国内不可达，导致无法重建 web 镜像，只能临时热修。该问题在本次接管中通过复用/拉取可用缓存完成了正式 rebuild，但后续如果更换基础镜像或执行 `--no-cache`，仍可能再次遇到镜像源可达性问题。

## 影响范围

| 功能 | 镜像版本 | 源码版本 | 是否可用 |
|---|---|---|---|
| 首页 `/` | ✅ 正式重建镜像 | rank() 返回 {items,slice,...} | 200 |
| `/models` | ✅ | ✅ | 200 |
| `/providers` | ✅ | ✅ | 200 |
| `/rankings` | ✅ | ✅ (v3) | 200 |
| `/recommend` | ✅ | ✅ | 200 |
| `/rankings/[type]` | ✅ | ✅ | 200 |
| `/compare` | ✅ | ✅ | 200 |
| freshness 评分 | ✅ | ✅ | 已上线 |
| 精选/全量双模式 | ✅ | ✅ | 已上线 |
| review_queue 去重 | ✅ | ✅ | 200 |
| pricing region 区分 | ✅ (backfill 已执行) | ✅ | DB 已生效 |

## 热修尝试记录

- **tar 注入 .next**：部分成功，但注入后首页 500（新旧 chunk 冲突）
- **kill-node + replace + restart**：容器崩溃，restart loop
- **仅注入新页面**：共享 chunk ID 不匹配，308 重定向

## 热修结论

`.next` 热修不可靠。新旧 Webpack 构建的 chunk ID 和模块引用不兼容。

**只有一种方式可以让最新代码完整运行：正式重建镜像。不要再做 `.next` 注入。**

```
docker compose -f docker-compose.prod.yml build web --progress=plain
docker compose -f docker-compose.prod.yml up -d web
```

## 恢复步骤

后续常规部署步骤：

1. 登录服务器
2. `cd ~/aileida-plus && git pull origin main`
3. `docker compose -f docker-compose.prod.yml build web --progress=plain`
4. `docker compose -f docker-compose.prod.yml up -d web`
5. 验证主要页面 200 或合理 30x

如果必须彻底重建缓存，再使用 `--no-cache`；使用前先确认 Docker Hub 或 registry mirror 可用。

## Docker Hub 镜像代理

如果 Docker Hub 长期不可达，需配置镜像代理：

```json
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://hub-mirror.c.163.com"
  ]
}
```

写入 `/etc/docker/daemon.json`，然后 `sudo systemctl restart docker`。

---

> 当前线上功能：首页 + 核心页面均 200，`/rankings/[type]` 和 `/compare` 已可用。
> 当前最新源码和服务器工作区均为 GitHub `6923555`。
