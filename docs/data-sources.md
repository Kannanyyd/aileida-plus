# 数据源说明

## 国际源

| 源 | 格式 | 频率 | 可信度 | 备注 |
|---|---|---|---|---|
| LiteLLM | JSON（GitHub raw） | 6h | 0.85 | model_prices_and_context_window.json |
| OpenRouter | REST API | 6h | 0.90 | /api/v1/models |
| llm-prices current | JSON | 12h | 0.85 | 由社区维护 |
| llm-prices historical | JSON | 24h | 0.85 | 历史快照用于趋势 |
| genai-prices (fork) | JSON | 24h | 0.90 | 复用了 pydantic/genai-prices 数据模型 |

## 国内厂商源

每个厂商至少抓取四类 URL：价格页、模型列表、公告、优惠。

| 厂商 | 价格页 | 抓取方式 | 优先级 |
|---|---|---|---|
| DeepSeek | api-docs.deepseek.com | fetch | P0 |
| 阿里云百炼 | help.aliyun.com | Playwright | P0 |
| 火山方舟 / 豆包 | volcengine.com | Playwright | P0 |
| 腾讯混元 | cloud.tencent.com | Playwright | P0 |
| 百度千帆 | cloud.baidu.com | Playwright | P1 |
| 智谱 GLM | open.bigmodel.cn | Playwright | P1 |
| 月之暗面 Kimi | platform.moonshot.cn | Playwright | P1 |
| MiniMax | platform.minimax.io | Playwright | P1 |
| 硅基流动 | siliconflow.cn | Playwright | P1 |

## 抓取限制

- 单源间隔 ≥ 60s
- 失败重试 3 次，指数退避
- UA 模拟浏览器
- Accept-Language zh-CN
- 原始内容保留 180 天
