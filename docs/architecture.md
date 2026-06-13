# AI 模型价格雷达 — 总体架构

## 核心承诺

每条价格数据都带四个字段：`source_url / source_snapshot / confidence_score / need_manual_review`。
永远不展示无来源的"确定价格"。

## 系统分层

```
数据源层 (4 国际 + 9 国内) → 抓取适配层 → 标准化层 → Diff 引擎 → Postgres → Next.js
```

- **数据源层**：LiteLLM JSON / OpenRouter REST / llm-prices JSON / genai-prices JSON / 国内厂商 HTML（Playwright 抓取）
- **抓取适配层**：各源独立 Adapter，统一接口 `fetch → parse → normalize`
- **标准化层**：统一币种 (USD/CNY)、单位 (per 1M tokens)、阶梯/缓存/批量折扣
- **Diff 引擎**：新模型检测 / 自动变更 / 多源冲突 → 复核队列
- **数据库**：PostgreSQL 16，Drizzle ORM，JSONB 存原始快照
- **应用层**：Next.js 15 App Router + Tailwind + shadcn/ui + Recharts

## 核心表

| 表 | 用途 |
|---|---|
| providers | 国内外厂商 |
| models | 模型（name/slug/context/capabilities） |
| pricing | 当前生效价格（1 模型 1 行） |
| price_change_log | 历史变更日志 |
| promotions | 优惠活动 |
| review_queue | 人工复核 |
| source_snapshots | 原始抓取快照 |
| scraper_jobs | 抓取任务状态 |
| fx_rates | 汇率快照 |

## 性价比评分

```
综合分 = 0.40 × 价格分 + 0.20 × 上下文分 + 0.20 × 能力分 + 0.10 × 稳定性分 + 0.10 × 可信度分
```

不同榜单（写作、编程、长文本、最便宜、多模态、免费额度）权重有微调。
