# ============================================================
# AI 模型价格雷达 — Dockerfile (多阶段，npm workspaces)
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 monorepo 配置
COPY package.json package-lock.json ./
COPY packages/pricing-core/package.json ./packages/pricing-core/
COPY apps/web/package.json ./apps/web/

# 安装依赖
RUN npm ci --production=false

# 复制源码
COPY packages/pricing-core ./packages/pricing-core
COPY apps/web ./apps/web

# 构建
RUN npm run build:core && npm run build:web

# ============================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 standalone 构建产物
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
