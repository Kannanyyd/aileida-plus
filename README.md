# AI 模型价格雷达（ModelPrice Radar）

> 实时追踪 AI 模型价格、优惠和性价比——AI 模型领域的"股票行情站 + 价格计算器 + 优惠情报站"。

## 数据来源

- **国际**：[LiteLLM](https://github.com/BerriAI/litellm)、[OpenRouter](https://openrouter.ai/)、[simonw/llm-prices](https://github.com/simonw/llm-prices)、[pydantic/genai-prices](https://github.com/pydantic/genai-prices)（fork）
- **国内**：首批种子数据源包括阿里云百炼、火山方舟、腾讯混元、百度千帆、智谱、月之暗面、DeepSeek、MiniMax、硅基流动等。系统架构支持持续注册新的厂商和数据源，通过后台 `/admin/providers` 扩展，不写死数量。

> 每条价格都带 `source_url / source_snapshot / confidence_score / need_manual_review`。
> 不会自动覆盖已审核数据，冲突价格进入人工复核队列。

## 架构

```
apps/
  web/         Next.js 15 前台 + 后台
  worker/      抓取 / 标准化 / Diff 引擎
packages/
  pricing-core/ 价格计算引擎（fork 自 pydantic/genai-prices）
```

## 本地启动

```bash
# 1. 启动 Postgres
docker compose up -d postgres adminer

# 2. 安装依赖
pnpm install

# 3. 复制环境变量
cp .env.example .env

# 4. 迁移数据库 & 种子
pnpm db:migrate
pnpm db:seed

# 5. 启动前台 + worker
pnpm dev

# 浏览器打开
# http://localhost:3000         前台
# http://localhost:3000/admin   后台
# http://localhost:8080         Adminer
```

## 抓取数据

```bash
# 抓取全部数据源
pnpm scrape:all

# 单独抓取
pnpm --filter worker run scrape:litellm
pnpm --filter worker run scrape:openrouter
pnpm --filter worker run scrape:llm-prices
```

## 文档

- `docs/architecture.md` 总体架构
- `docs/data-sources.md` 数据源说明
- `docs/ranking-formula.md` 性价比评分公式

## License

MIT
