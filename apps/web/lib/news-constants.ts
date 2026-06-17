/** 新闻分类 —— 与 worker/sources/news-registry 保持一致 */
export const CATEGORY_LABELS: Record<string, { zh: string; icon: string }> = {
  all:             { zh: "全部动态", icon: "📋" },
  "new-model":     { zh: "新模型发布", icon: "🆕" },
  "price-change":  { zh: "价格变化", icon: "📊" },
  "policy":        { zh: "政策监管", icon: "🏛️" },
  "capability":    { zh: "能力升级", icon: "⚡" },
  "benchmark":     { zh: "评测榜单", icon: "🏆" },
  "product-update":{ zh: "产品更新", icon: "🔧" },
  "funding":       { zh: "投融资", icon: "💰" },
  "partnership":   { zh: "合作动态", icon: "🤝" },
  "other":         { zh: "其他", icon: "📋" },
};

export const CATEGORY_PAGES: Record<string, { title: string; description: string }> = {
  all:             { title: "每日 AI 动态", description: "最新 AI 模型发布、价格变化和行业动态" },
  "new-model":     { title: "新模型发布", description: "国内外 AI 厂商最新发布的模型和版本更新" },
  "price-change":  { title: "价格变化", description: "AI API 价格调整、取消和新增计费项" },
  "policy":        { title: "政策监管", description: "国内 AI 相关政策、法规和监管动态" },
  "capability":    { title: "能力升级", description: "模型能力、上下文长度、模态支持的更新" },
  "benchmark":     { title: "评测榜单", description: "主流评测基准的排名变化和测试结果" },
  "product-update":{ title: "产品更新", description: "各厂商平台功能、控制台和 API 的更新" },
};
