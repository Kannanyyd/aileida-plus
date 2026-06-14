# 热修风险文档

## 当前状态

Docker Hub 国内不可达，无法通过 `docker compose build web` 重建 web 镜像。

线上容器运行的是 **Docker 镜像版本**（构建于 2026-06-13 19:33），而非最新源码。

## 影响范围

| 功能 | 镜像版本 | 源码版本 | 是否可用 |
|---|---|---|---|
| 首页 `/` | ✅ 旧版 rank() 返回数组 | rank() 返回 {items,slice,...} | 200 |
| `/models` | ✅ | ✅ | 200 |
| `/providers` | ✅ | ✅ | 200 |
| `/rankings` | ✅ | ✅ (v3) | 200 |
| `/recommend` | ✅ | ✅ | 200 |
| `/rankings/[type]` | ❌ 不存在 | ✅ | 404 |
| `/compare` | ❌ 不存在 | ✅ | 404 |
| freshness 评分 | ❌ | ✅ | N/A |
| 精选/全量双模式 | ❌ | ✅ | N/A |
| review_queue 去重 | ✅ | ✅ | 200 |
| pricing region 区分 | ✅ (backfill 已执行) | ✅ | DB 已生效 |

## 热修尝试记录

- **tar 注入 .next**：部分成功，但注入后首页 500（新旧 chunk 冲突）
- **kill-node + replace + restart**：容器崩溃，restart loop
- **仅注入新页面**：共享 chunk ID 不匹配，308 重定向

## 热修结论

`.next` 热修不可靠。新旧 Webpack 构建的 chunk ID 和模块引用不兼容。

**只有一种方式可以让最新代码完整运行：**

```
docker compose -f docker-compose.prod.yml build web --no-cache
docker compose -f docker-compose.prod.yml up -d web
```

## 恢复步骤

当 Docker Hub 恢复后：

1. 登录服务器
2. `cd ~/aileida-plus && git pull origin main`
3. `docker compose -f docker-compose.prod.yml build web --no-cache`
4. `docker compose -f docker-compose.prod.yml up -d web`
5. 验证所有页面 200

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

> 当前线上功能：首页 + 核心页面均 200，但 `/rankings/[type]` 和 `/compare` 不可用。
> 所有最新源码均在 GitHub `cc6865e`，等 Docker Hub 恢复后重建即可完整上线。
