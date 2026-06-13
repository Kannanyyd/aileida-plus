# 48 小时执行计划

> 目标：保存代码到 GitHub + 修复排行榜/推荐逻辑 + 区分国内/海外价格
> 不处理域名、HTTPS、SEO

---

## 第 1-3 小时：GitHub + Region Backfill

### 1.1 GitHub push [P0]
```powershell
cd "D:\Agent\自动化\AI订阅雷达"
git push origin main
```
- 推送 10 个 commits 到 GitHub
- 确认 .env/.pem 不在仓库中

### 1.2 pricing region backfill [P0]
```sql
-- LiteLLM 中的国内厂商 → region=china_mainland
UPDATE pricing SET region = 'china_mainland', is_domestic = true
WHERE primary_source_id = 'litellm' 
AND model_id IN (SELECT id FROM models WHERE provider_id IN (
  SELECT id FROM providers WHERE slug IN ('deepseek','moonshot','zhipu','MiniMax','volcengine','siliconflow','baidu','alibaba','tencent','stepfun','baichuan','yi')
));

-- OpenRouter → region=overseas, channel=aggregator
UPDATE pricing SET region = 'overseas', channel = 'aggregator', is_aggregator = true, is_official = false
WHERE primary_source_id = 'openrouter';

-- genai-prices/llm-prices → region=global, channel=official_api
UPDATE pricing SET region = 'global', channel = 'official_api', is_official = true
WHERE primary_source_id IN ('genai-prices', 'llm-prices');
```

---

## 第 4-8 小时：Docker Chromium 镜像

### 2.1 配置 Docker 镜像代理 [P0]
```bash
# 服务器上执行
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://hub-mirror.c.163.com"
  ]
}
EOF
sudo systemctl restart docker
docker pull node:22-slim  # 测试
```

### 2.2 构建 worker 镜像 [P0]
- Dockerfile.worker 使用 `node:22-slim`
- `apt-get install chromium`（系统包，不卡死）
- Playwright 用 `executablePath: /usr/bin/chromium`
- 构建 `docker compose build worker --no-cache`

### 2.3 验证 Playwright [P0]
```bash
docker compose exec worker node -e "
const {chromium} = require('playwright');
chromium.launch({headless:true,args:['--no-sandbox']}).then(b=>b.close()).then(()=>console.log('OK'))
"
```

### 2.4 运行国内 scraper [P0]
```bash
docker compose exec worker npm run scrape:all
```
目标：至少 5 家厂商有 pricing > 0

---

## 第 9-16 小时：排行榜 + 推荐逻辑完善

### 3.1 验证排行榜 freshness [P1]
- 检查 `/rankings/frontier-value` 是否只显示 status=active 的模型
- 检查 Top 20 中是否有 deprecated 模型（应该没有）
- 验证 freshness 权重是否生效

### 3.2 推荐助手接入 freshness [P1]
- `recommend/route.ts` 中调用 `getModelTier()`
- 默认过滤 status=active
- 结果排序含 freshness 因子
- 输出推荐理由

### 3.3 排行榜多渠道合并 [P1]
- 同一 model_id 多条 pricing → 榜单默认显示一条
- 展开查看不同渠道价格
- 显示国内最低价 / 海外最低价 / 聚合平台最低价

### 3.4 review_queue 后台页 [P1]
- 新建 `/admin/review` 页面
- 筛选：按厂商、来源、原因、状态
- 批量操作：通过/忽略/标记已处理

---

## 第 17-32 小时：数据完善

### 4.1 国内 scraper CSS 选择器 [P1]
- 针对 9 家厂商逐家写 Playwright 选择器
- 优先抓 DeepSeek、硅基流动、阿里云百炼（已有 API 文档）
- 智谱 GLM、MiniMax 如需登录则标记不可抓

### 4.2 厂商详情页补充 [P1]
- 为前 20 家厂商写真实介绍（中文）
- 标注是否支持国内付款/企业发票

### 4.3 数据库备份 [P1]
```bash
# cron: 每天凌晨 3 点备份
0 3 * * * pg_dump -U aileida aileida_radar > ~/backup/$(date +%Y%m%d).sql
```

---

## 第 33-48 小时：验证 + 上线准备

### 5.1 全站验收 [P1]
- 首页 200，数据不为空
- 排行榜 Top 50 无旧模型
- 推荐助手推荐理由可读
- 模型详情多渠道价格不为空
- review_queue 后台可操作

### 5.2 最终 commit + push [P0]
- 所有改动提交
- `git push origin main`
- 确认远程仓库包含全部代码

### 5.3 更新 PROJECT_PROGRESS_AND_TODO.md [P1]
- 更新数据量
- 更新各源状态
- 更新遗留问题

---

## 验收标准

| # | 标准 |
|---|---|
| 1 | GitHub 包含全部 10+ commits |
| 2 | pricing.region 正确区分 global/overseas/china_mainland |
| 3 | 排行榜默认无 deprecated 模型 |
| 4 | 推荐助手优先当前主流模型 |
| 5 | Top 50 榜单可正常加载 |
| 6 | 精选榜同厂商 ≤5 |
| 7 | 精选榜同家族 ≤3 |
| 8 | 至少 1 家国内厂商有真实价格（理想 5+） |
| 9 | review_queue ≤ 1000 |
| 10 | 全站 HTTP 200 |

---

> 当前最重要目标：先保存代码到 GitHub，再修排行榜和推荐逻辑。
