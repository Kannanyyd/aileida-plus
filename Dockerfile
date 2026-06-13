# ============================================================
# AI 模型价格雷达 — Web Dockerfile
# ============================================================
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Layer 1: install deps
COPY package.json tsconfig.base.json ./
COPY packages/pricing-core/package.json ./packages/pricing-core/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/

RUN npm install --include=dev

# Layer 2: copy source + build
COPY . .

RUN npm run build:core && npm run build:web

WORKDIR /app/apps/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["npx", "next", "start", "--port", "3000"]
