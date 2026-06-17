/**
 * 新闻源注册表 —— 20+ 国内 AI 动态源 + 海外主流源
 *
 * 优先级排序：
 *   P10 = 实时必抓（国内官方价格/公告）
 *   P8  = 高频（价格页/文档更新）
 *   P5  = 常规（科技媒体/博客）
 *   P3  = 低频（政策/监管/海外）
 */
export interface NewsSourceConfig {
  slug: string;
  name_zh: string;
  name_en: string;
  source_type: "rss" | "api" | "html" | "sitemap" | "github" | "docs";
  region: "cn" | "global";
  provider_slug?: string;
  urls: string[];
  fetch_schedule: string;
  parser_type: "rss" | "html" | "json-api" | "sitemap";
  priority: number;
}

export const NEWS_SOURCE_REGISTRY: NewsSourceConfig[] = [
  // ========== 国内 AI 厂商官方公告 & 价格页 (P10) ==========
  {
    slug: "deepseek-official",
    name_zh: "DeepSeek 官方公告", name_en: "DeepSeek Official",
    source_type: "html", region: "cn", provider_slug: "deepseek",
    urls: ["https://api-docs.deepseek.com/news/"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "aliyun-bailian-news",
    name_zh: "阿里云百炼公告", name_en: "Alibaba Bailian News",
    source_type: "docs", region: "cn", provider_slug: "aliyun-bailian",
    urls: ["https://help.aliyun.com/zh/model-studio/release-notes"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "volcengine-ark-news",
    name_zh: "火山方舟公告", name_en: "Volcengine Ark News",
    source_type: "docs", region: "cn", provider_slug: "volcengine-ark",
    urls: ["https://www.volcengine.com/docs/82379"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "tencent-hunyuan-news",
    name_zh: "腾讯混元公告", name_en: "Tencent Hunyuan News",
    source_type: "docs", region: "cn", provider_slug: "tencent-hunyuan",
    urls: ["https://cloud.tencent.com/announce"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "baidu-qianfan-news",
    name_zh: "百度千帆公告", name_en: "Baidu Qianfan News",
    source_type: "docs", region: "cn", provider_slug: "baidu-qianfan",
    urls: ["https://cloud.baidu.com/support/newsroom"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "zhipu-official",
    name_zh: "智谱 AI 公告", name_en: "Zhipu AI News",
    source_type: "docs", region: "cn", provider_slug: "zhipu-glm",
    urls: ["https://open.bigmodel.cn/dev/howuse/announcement"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "moonshot-official",
    name_zh: "月之暗面 Kimi 公告", name_en: "Moonshot Kimi News",
    source_type: "docs", region: "cn", provider_slug: "moonshot-kimi",
    urls: ["https://platform.moonshot.cn/docs/announcement"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "minimax-official",
    name_zh: "MiniMax 公告", name_en: "MiniMax News",
    source_type: "docs", region: "cn", provider_slug: "MiniMax",
    urls: ["https://platform.minimax.io/notice"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },
  {
    slug: "siliconflow-official",
    name_zh: "硅基流动公告", name_en: "SiliconFlow News",
    source_type: "html", region: "cn", provider_slug: "siliconflow",
    urls: ["https://siliconflow.cn/news"],
    fetch_schedule: "0 * * * *", parser_type: "html", priority: 10,
  },

  // ========== 科技媒体 & 聚合源 (P8) ==========
  {
    slug: "jiqizhixin",
    name_zh: "机器之心", name_en: "JiqiZhixin",
    source_type: "rss", region: "cn",
    urls: ["https://www.jiqizhixin.com/rss"],
    fetch_schedule: "0 */3 * * *", parser_type: "rss", priority: 8,
  },
  {
    slug: "36kr-ai",
    name_zh: "36氪 AI 频道", name_en: "36Kr AI",
    source_type: "rss", region: "cn",
    urls: ["https://36kr.com/feed?cid=ai"],
    fetch_schedule: "0 */3 * * *", parser_type: "rss", priority: 8,
  },
  {
    slug: "leiphone-ai",
    name_zh: "雷锋网 AI", name_en: "Leiphone AI",
    source_type: "rss", region: "cn",
    urls: ["https://www.leiphone.com/category/ai/feed"],
    fetch_schedule: "0 */4 * * *", parser_type: "rss", priority: 8,
  },

  // ========== 海外主流厂商 (P5) ==========
  {
    slug: "openai-blog",
    name_zh: "OpenAI 官方博客", name_en: "OpenAI Blog",
    source_type: "rss", region: "global",
    urls: ["https://openai.com/blog/rss.xml"],
    fetch_schedule: "0 */6 * * *", parser_type: "rss", priority: 5,
  },
  {
    slug: "anthropic-blog",
    name_zh: "Anthropic 官方博客", name_en: "Anthropic Blog",
    source_type: "rss", region: "global",
    urls: ["https://www.anthropic.com/blog/rss.xml"],
    fetch_schedule: "0 */6 * * *", parser_type: "rss", priority: 5,
  },
  {
    slug: "google-ai-blog",
    name_zh: "Google AI 博客", name_en: "Google AI Blog",
    source_type: "rss", region: "global",
    urls: ["https://blog.google/technology/ai/rss/"],
    fetch_schedule: "0 */6 * * *", parser_type: "rss", priority: 5,
  },
  {
    slug: "meta-ai-blog",
    name_zh: "Meta AI 博客", name_en: "Meta AI Blog",
    source_type: "rss", region: "global",
    urls: ["https://ai.meta.com/blog/rss/"],
    fetch_schedule: "0 */8 * * *", parser_type: "rss", priority: 5,
  },

  // ========== 开源 & 评测 (P5) ==========
  {
    slug: "huggingface-blog",
    name_zh: "Hugging Face 博客", name_en: "HuggingFace Blog",
    source_type: "rss", region: "global",
    urls: ["https://huggingface.co/blog/feed.xml"],
    fetch_schedule: "0 */6 * * *", parser_type: "rss", priority: 5,
  },
  {
    slug: "modelscope-updates",
    name_zh: "ModelScope 魔搭更新", name_en: "ModelScope Updates",
    source_type: "html", region: "cn",
    urls: ["https://modelscope.cn/models"],
    fetch_schedule: "0 */12 * * *", parser_type: "html", priority: 5,
  },

  // ========== 政策监管 (P3) ==========
  {
    slug: "cac-policy",
    name_zh: "国家网信办 AI 政策", name_en: "CAC AI Policy",
    source_type: "html", region: "cn",
    urls: ["http://www.cac.gov.cn/wxzw/A0904index_1.htm"],
    fetch_schedule: "0 */24 * * *", parser_type: "html", priority: 3,
  },
  {
    slug: "miit-ai",
    name_zh: "工信部 AI 动态", name_en: "MIIT AI News",
    source_type: "html", region: "cn",
    urls: ["https://www.miit.gov.cn/jgsj/kjs/jscx/"],
    fetch_schedule: "0 */24 * * *", parser_type: "html", priority: 3,
  },

  // ========== GitHub 仓库更新 (P5) ==========
  {
    slug: "deepseek-github",
    name_zh: "DeepSeek GitHub", name_en: "DeepSeek GitHub",
    source_type: "github", region: "cn", provider_slug: "deepseek",
    urls: ["https://github.com/deepseek-ai"],
    fetch_schedule: "0 */12 * * *", parser_type: "json-api", priority: 5,
  },
  {
    slug: "qwen-github",
    name_zh: "Qwen GitHub", name_en: "Qwen GitHub",
    source_type: "github", region: "cn", provider_slug: "aliyun-bailian",
    urls: ["https://github.com/QwenLM"],
    fetch_schedule: "0 */12 * * *", parser_type: "json-api", priority: 5,
  },
];

/** 新闻分类中文标签 */
export const CATEGORY_LABELS: Record<string, { zh: string; icon: string }> = {
  "new-model":       { zh: "新模型发布", icon: "🆕" },
  "price-change":    { zh: "价格变化", icon: "📊" },
  "promotion":       { zh: "优惠活动", icon: "🎁" },
  "plan-update":     { zh: "会员/Plan 更新", icon: "💎" },
  "policy":          { zh: "政策监管", icon: "🏛️" },
  "capability":      { zh: "能力升级", icon: "⚡" },
  "benchmark":       { zh: "评测榜单", icon: "🏆" },
  "product-update":  { zh: "产品更新", icon: "🔧" },
  "funding":         { zh: "投融资", icon: "💰" },
  "partnership":     { zh: "合作动态", icon: "🤝" },
  "other":           { zh: "其他", icon: "📋" },
};

/** 按分类过滤的页面标题 */
export const CATEGORY_PAGES: Record<string, { title: string; description: string }> = {
  all:             { title: "每日 AI 动态", description: "最新 AI 模型发布、价格变化、优惠活动和行业动态" },
  "new-model":     { title: "新模型发布", description: "国内外 AI 厂商最新发布的模型和版本更新" },
  "price-change":  { title: "价格变化", description: "AI API 价格调整、取消和新增计费项" },
  "promotion":     { title: "优惠活动", description: "免费额度、限时折扣、新用户赠送等优惠动态" },
  "plan-update":   { title: "会员/Plan 更新", description: "各平台会员方案、订阅计划的调整和新增" },
  "policy":        { title: "政策监管", description: "国内 AI 相关政策、法规和监管动态" },
  "capability":    { title: "能力升级", description: "模型能力、上下文长度、模态支持的更新" },
  "benchmark":     { title: "评测榜单", description: "主流评测基准的排名变化和测试结果" },
  "product-update":{ title: "产品更新", description: "各厂商平台功能、控制台和 API 的更新" },
};
