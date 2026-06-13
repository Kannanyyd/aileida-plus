#!/bin/bash
# ============================================================
# AI 模型价格雷达 — 一键部署脚本
# 用法: ./deploy.sh [staging|production]
# ============================================================
set -euo pipefail

ENV="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================="
echo " AI 模型价格雷达 — 部署脚本"
echo " 环境: ${ENV}"
echo " 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="

# ---- 检查依赖 ----
echo ">> 检查依赖..."
command -v docker >/dev/null 2>&1 || { echo "错误: 需要安装 Docker"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "错误: 需要安装 Node.js"; exit 1; }

# ---- 加载环境变量 ----
if [ -f ".env.${ENV}" ]; then
  echo ">> 加载 .env.${ENV}"
  set -a; source ".env.${ENV}"; set +a
elif [ -f ".env" ]; then
  echo ">> 加载 .env"
  set -a; source ".env"; set +a
else
  echo "警告: 未找到 .env 文件，使用默认值"
  export DB_PASSWORD="change-me-in-production"
  export ADMIN_PASSWORD="admin123"
  export APP_BASE_URL="http://localhost:3000"
fi

# ---- 安装依赖 ----
echo ">> 安装依赖..."
npm install --production=false

# ---- 构建 ----
echo ">> 构建项目..."
npm run build

# ---- 数据库迁移 ----
echo ">> 运行数据库迁移..."
npm run db:migrate

# ---- 种子数据 ----
echo ">> 种子数据..."
npm run db:seed 2>/dev/null || echo "种子数据跳过 (可能已存在)"

# ---- 启动 ----
if [ "$ENV" = "production" ]; then
  echo ">> 启动生产环境 (docker compose)..."
  docker compose -f docker-compose.prod.yml up -d --build
else
  echo ">> 启动开发环境..."
  docker compose up -d postgres adminer
  echo ">> 等待数据库就绪..."
  sleep 5
  echo ">> 启动 Next.js..."
  npm run dev
fi

echo ""
echo "=============================================="
echo " 部署完成!"
echo " Web:    ${APP_BASE_URL:-http://localhost:3000}"
echo " 管理:   ${APP_BASE_URL:-http://localhost:3000}/admin"
echo "=============================================="
