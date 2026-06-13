/**
 * 推荐评分引擎
 *
 * 核心公式：
 *   recommend_score =
 *     场景匹配分×0.30 + 价格匹配分×0.20 + 能力匹配分×0.20
 *     + 稳定性分×0.10 + 用户点评分×0.10 + 技术要求匹配分×0.05 + 优惠匹配分×0.05
 *
 * 不同场景可调整权重（如客服场景价格权重更高）。
 */

/** 用户输入 */
export interface RecommendInput {
  scenario: string;
  intensity: "low" | "medium" | "high" | "enterprise";
  budget: "cheapest" | "budget" | "balanced" | "quality" | "stability" | "cn-payment" | "free-tier";
  monthlyInputTokens?: number;
  monthlyOutputTokens?: number;
  monthlyImages?: number;
  monthlyAudioMinutes?: number;
  monthlyVideos?: number;
  concurrency?: number;
  needCache?: boolean;
  needBatch?: boolean;
  techRequirements: string[];   // 'api' | 'cn-accessible' | 'cn-payment' | 'function-call' | 'json-mode' | 'long-context' | 'vision' | 'self-hosted' | 'open-source' | 'low-latency' | 'high-concurrency'
  quality: string;              // 'basic' | 'good-chinese' | 'strong-reasoning' | 'strong-code' | 'stable-output' | 'multimodal' | 'enterprise-stability'
}

/** 被评分的模型 */
export interface ScorableModel {
  modelId: string;
  modelName: string;
  providerName: string;
  slug: string;

  // 价格 (USD/1M tokens)
  inputUsd: number;
  outputUsd: number;
  cachedReadUsd?: number;
  cachedWriteUsd?: number;
  tieredRules?: unknown;

  // 能力
  contextLength: number;
  capabilities: string[];
  strengths: string[];       // 擅长方向 slug 列表
  avgOverallRating?: number; // 用户综合评分均值

  // 元信息
  confidenceScore: number;
  hasPromotion: boolean;
}

/** 场景权重配置 */
export interface ScenarioWeights {
  scenarioMatch: number;
  priceMatch: number;
  capabilityMatch: number;
  stability: number;
  userRating: number;
  techMatch: number;
  promotion: number;
}

/** 默认权重 */
const DEFAULT_WEIGHTS: ScenarioWeights = {
  scenarioMatch: 0.30,
  priceMatch: 0.20,
  capabilityMatch: 0.20,
  stability: 0.10,
  userRating: 0.10,
  techMatch: 0.05,
  promotion: 0.05,
};

/** 各预设场景的权重 */
const SCENARIO_WEIGHTS: Record<string, Partial<ScenarioWeights>> = {
  "customer-service": { priceMatch: 0.25, stability: 0.15, scenarioMatch: 0.25, capabilityMatch: 0.15, userRating: 0.10, techMatch: 0.05, promotion: 0.05 },
  "code-generation": { capabilityMatch: 0.30, scenarioMatch: 0.20, stability: 0.15, priceMatch: 0.15, userRating: 0.10, techMatch: 0.05, promotion: 0.05 },
  "long-doc":       { capabilityMatch: 0.30, scenarioMatch: 0.20, priceMatch: 0.20, stability: 0.10, userRating: 0.10, techMatch: 0.05, promotion: 0.05 },
  "chatbot":        { scenarioMatch: 0.25, priceMatch: 0.25, stability: 0.15, capabilityMatch: 0.15, userRating: 0.10, techMatch: 0.05, promotion: 0.05 },
  "translation":    { scenarioMatch: 0.25, priceMatch: 0.20, capabilityMatch: 0.20, stability: 0.15, userRating: 0.10, techMatch: 0.05, promotion: 0.05 },
  "writing":        { scenarioMatch: 0.25, capabilityMatch: 0.25, priceMatch: 0.20, stability: 0.10, userRating: 0.10, techMatch: 0.05, promotion: 0.05 },
};

/** 场景→擅长标签映射 */
const SCENARIO_TAGS: Record<string, string[]> = {
  "writing":           ["chinese-writing", "english-writing", "document-summary"],
  "code-generation":   ["code-generation", "code-explanation", "complex-reasoning", "json-output"],
  "customer-service":  ["multi-turn-dialogue", "customer-qa", "low-cost", "high-concurrency"],
  "kb-qa":             ["multi-turn-dialogue", "long-text-analysis", "document-summary"],
  "long-doc":          ["long-text-analysis", "document-summary"],
  "image-understand":  ["multimodal-understanding", "image-understanding"],
  "video-gen":         ["video-generation"],
  "speech-recognition":["speech-recognition"],
  "tts":               ["text-to-speech"],
  "data-analysis":     ["complex-reasoning", "math-reasoning", "json-output"],
  "agent":             ["agent-tool-use", "function-calling", "json-output", "enterprise-stability"],
  "translation":       ["chinese-writing", "english-writing"],
  "education":         ["chinese-writing", "complex-reasoning", "multi-turn-dialogue"],
};

function getScenarioSlug(scenario: string): string {
  const map: Record<string, string> = {
    "写文章 / 改写 / 总结": "writing",
    "代码生成 / 代码解释": "code-generation",
    "客服机器人": "customer-service",
    "知识库问答": "kb-qa",
    "长文档分析": "long-doc",
    "图片理解": "image-understand",
    "视频生成": "video-gen",
    "语音识别": "speech-recognition",
    "语音合成": "tts",
    "数据分析": "data-analysis",
    "Agent 自动化": "agent",
    "翻译": "translation",
    "教育辅导": "education",
    "写作": "writing",
    "编程": "code-generation",
    "客服": "customer-service",
    "长文档": "long-doc",
  };
  return map[scenario] ?? scenario.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/** 评估 budget 匹配程度 (0-1) */
function budgetMatch(input: RecommendInput, m: ScorableModel): number {
  if (m.inputUsd === 0 && m.outputUsd === 0) {
    // 免费
    return input.budget === "free-tier" || input.budget === "cheapest" ? 1 : 0.6;
  }
  // 归一化：按行业分布估算分位
  const avgPrice = (m.inputUsd + m.outputUsd) / 2;
  // 定义大致的便宜/中等/高价位分界
  if (input.budget === "cheapest" || input.budget === "free-tier") {
    return avgPrice < 0.15 ? 1 : avgPrice < 0.50 ? 0.7 : avgPrice < 1.0 ? 0.4 : 0.1;
  }
  if (input.budget === "budget") {
    return avgPrice < 0.30 ? 1 : avgPrice < 1.0 ? 0.7 : avgPrice < 2.0 ? 0.4 : 0.2;
  }
  if (input.budget === "balanced") {
    return avgPrice < 0.50 ? 0.8 : avgPrice < 1.5 ? 1 : avgPrice < 3.0 ? 0.7 : 0.4;
  }
  if (input.budget === "quality" || input.budget === "stability") {
    // 高价位模型在这些场景里有它的合理性
    return avgPrice < 0.30 ? 0.5 : avgPrice < 1.5 ? 0.8 : 1;
  }
  if (input.budget === "cn-payment") {
    return avgPrice < 1.0 ? 1 : avgPrice < 2.5 ? 0.7 : 0.4;
  }
  return 0.5;
}

/** 场景匹配度 (0-1)：检查 strengths 与场景标签的重叠 */
function scenarioMatch(input: RecommendInput, m: ScorableModel): number {
  const slug = getScenarioSlug(input.scenario);
  const tags = SCENARIO_TAGS[slug] ?? [];
  if (tags.length === 0) return 0.5;
  const hits = tags.filter((t) => m.strengths.includes(t));
  return Math.min(1, hits.length / Math.max(3, tags.length * 0.5));
}

/** 能力匹配 (0-1)：检查 capabilities/strengths */
function capabilityMatch(input: RecommendInput, m: ScorableModel): number {
  let score = 0;
  // context 长度
  if (input.techRequirements.includes("long-context")) {
    score += m.contextLength >= 128000 ? 0.3 : m.contextLength >= 32000 ? 0.15 : 0;
  }
  // 函数调用
  if (input.techRequirements.includes("function-call") && m.capabilities.some((c) => c.includes("function-call") || c.includes("tool"))) score += 0.15;
  // JSON 模式
  if (input.techRequirements.includes("json-mode") && m.capabilities.some((c) => c.includes("json"))) score += 0.1;
  // 多模态
  if (input.techRequirements.includes("vision") && m.strengths.includes("multimodal-understanding")) score += 0.15;
  // 中文
  if (input.quality === "good-chinese" && m.strengths.includes("chinese-writing")) score += 0.15;
  // 推理
  if (input.quality === "strong-reasoning" && m.strengths.includes("complex-reasoning")) score += 0.2;
  // 代码
  if (input.quality === "strong-code" && m.strengths.includes("code-generation")) score += 0.2;

  return Math.min(1, score + 0.2); // 保底 0.2
}

/** 技术要求匹配 */
function techMatch(input: RecommendInput, _m: ScorableModel): number {
  let score = 0;
  const reqs = input.techRequirements;
  if (reqs.length === 0) return 0.7;
  // 国内可访问 / 付款等在地信息需要从 provider region 判断，这里用简版
  if (reqs.includes("cn-accessible") || reqs.includes("cn-payment")) score += 0.3;
  if (reqs.includes("self-hosted") || reqs.includes("open-source")) score += 0.2;
  if (reqs.includes("low-latency")) score += 0.15;
  if (reqs.includes("high-concurrency")) score += 0.15;
  return Math.min(1, score + 0.3);
}

/** 稳定性分 (0-1) */
function stabilityScore(_input: RecommendInput, m: ScorableModel): number {
  // 基于 confidence_score 和是否有用户点评
  const c = m.confidenceScore >= 0.8 ? 1 : m.confidenceScore >= 0.6 ? 0.6 : 0.3;
  const r = (m.avgOverallRating ?? 0) >= 4 ? 0.3 : (m.avgOverallRating ?? 0) >= 3 ? 0.15 : 0;
  return Math.min(1, c * 0.7 + r);
}

function userRatingScore(_input: RecommendInput, m: ScorableModel): number {
  return m.avgOverallRating ? Math.min(1, (m.avgOverallRating - 1) / 4) : 0.4; // 无点评给中性分
}

function promotionScore(_input: RecommendInput, m: ScorableModel): number {
  return m.hasPromotion ? 1 : 0;
}

/** 综合评分 */
export function computeRecommendScore(input: RecommendInput, model: ScorableModel): number {
  const slug = getScenarioSlug(input.scenario);
  const weights: ScenarioWeights = { ...DEFAULT_WEIGHTS, ...(SCENARIO_WEIGHTS[slug] ?? {}) };

  return (
    weights.scenarioMatch * scenarioMatch(input, model) +
    weights.priceMatch * budgetMatch(input, model) +
    weights.capabilityMatch * capabilityMatch(input, model) +
    weights.stability * stabilityScore(input, model) +
    weights.userRating * userRatingScore(input, model) +
    weights.techMatch * techMatch(input, model) +
    weights.promotion * promotionScore(input, model)
  );
}

/** 估算月成本（USD） */
export function estimateMonthlyCost(input: RecommendInput, model: ScorableModel): number {
  const inTokens = input.monthlyInputTokens ?? 100000;
  const outTokens = input.monthlyOutputTokens ?? 50000;
  const images = input.monthlyImages ?? 0;
  const cacheHit = input.needCache ? 0.5 : 0;

  let cost = 0;
  // 输入（含缓存命中）
  if (cacheHit > 0 && model.cachedReadUsd != null) {
    cost += (inTokens / 1_000_000) * (cacheHit * model.cachedReadUsd + (1 - cacheHit) * model.inputUsd);
  } else {
    cost += (inTokens / 1_000_000) * model.inputUsd;
  }
  // 输出
  cost += (outTokens / 1_000_000) * model.outputUsd;
  // 图片（示例：$0.002/图）
  cost += images * 0.002;

  return Math.round(cost * 100) / 100;
}

/** 生成推荐结果 */
export function generateRecommendations(input: RecommendInput, models: ScorableModel[]): RecommendResult {
  const scored = models
    .map((m) => ({
      model: m,
      score: computeRecommendScore(input, m),
      monthlyCost: estimateMonthlyCost(input, m),
    }))
    .sort((a, b) => b.score - a.score);

  const topN = scored.slice(0, Math.min(scored.length, 10));

  // 方案 A: 低成本优先
  const budget = [...topN]
    .sort((a, b) => a.monthlyCost - b.monthlyCost)
    .slice(0, 2);

  // 方案 B: 综合性价比
  const balanced = [...topN].slice(0, 2);

  // 方案 C: 效果优先（高分）
  const premium = [...topN]
    .sort((a, b) => {
      // 能力 + 稳定性加权
      const cA = capabilityMatch(input, a.model) * 0.4 + stabilityScore(input, a.model) * 0.4 + userRatingScore(input, a.model) * 0.2;
      const cB = capabilityMatch(input, b.model) * 0.4 + stabilityScore(input, b.model) * 0.4 + userRatingScore(input, b.model) * 0.2;
      return cB - cA;
    })
    .slice(0, 2);

  return {
    budget,
    balanced,
    premium,
    input,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "推荐结果基于本站当前收录的公开价格、模型参数、用户点评和场景匹配规则生成，仅供选型参考。不同提示词、数据质量、调用方式、网络环境和模型版本变化都可能影响实际效果。建议在正式接入前使用真实业务样本进行测试。",
  };
}

export interface RecommendEntry {
  model: ScorableModel;
  score: number;
  monthlyCost: number;
}

export interface RecommendResult {
  budget: RecommendEntry[];
  balanced: RecommendEntry[];
  premium: RecommendEntry[];
  input: RecommendInput;
  generatedAt: string;
  disclaimer: string;
}

/** 预设的擅长方向全量列表 */
export const ALL_STRENGTHS: { slug: string; nameZh: string; nameEn: string; category: string }[] = [
  { slug: "chinese-writing", nameZh: "中文写作", nameEn: "Chinese Writing", category: "capability" },
  { slug: "english-writing", nameZh: "英文写作", nameEn: "English Writing", category: "capability" },
  { slug: "code-generation", nameZh: "代码生成", nameEn: "Code Generation", category: "capability" },
  { slug: "code-explanation", nameZh: "代码解释", nameEn: "Code Explanation", category: "capability" },
  { slug: "complex-reasoning", nameZh: "复杂推理", nameEn: "Complex Reasoning", category: "capability" },
  { slug: "math-reasoning", nameZh: "数学推理", nameEn: "Math Reasoning", category: "capability" },
  { slug: "long-text-analysis", nameZh: "长文本分析", nameEn: "Long Text Analysis", category: "capability" },
  { slug: "document-summary", nameZh: "文档总结", nameEn: "Document Summary", category: "capability" },
  { slug: "multi-turn-dialogue", nameZh: "多轮对话", nameEn: "Multi-turn Dialogue", category: "capability" },
  { slug: "customer-qa", nameZh: "客服问答", nameEn: "Customer QA", category: "capability" },
  { slug: "agent-tool-use", nameZh: "Agent 工具调用", nameEn: "Agent Tool Use", category: "capability" },
  { slug: "function-calling", nameZh: "函数调用", nameEn: "Function Calling", category: "capability" },
  { slug: "json-output", nameZh: "JSON 输出", nameEn: "JSON Output", category: "capability" },
  { slug: "multimodal-understanding", nameZh: "多模态理解", nameEn: "Multimodal Understanding", category: "capability" },
  { slug: "image-understanding", nameZh: "图片理解", nameEn: "Image Understanding", category: "capability" },
  { slug: "speech-recognition", nameZh: "语音识别", nameEn: "Speech Recognition", category: "capability" },
  { slug: "text-to-speech", nameZh: "语音合成", nameEn: "Text-to-Speech", category: "capability" },
  { slug: "video-generation", nameZh: "视频生成", nameEn: "Video Generation", category: "capability" },
  { slug: "embedding", nameZh: "Embedding", nameEn: "Embedding", category: "capability" },
  { slug: "rerank", nameZh: "Rerank", nameEn: "Rerank", category: "capability" },
  { slug: "low-cost", nameZh: "低成本调用", nameEn: "Low Cost", category: "price" },
  { slug: "high-concurrency", nameZh: "高并发调用", nameEn: "High Concurrency", category: "scenario" },
  { slug: "enterprise-stability", nameZh: "企业级稳定性", nameEn: "Enterprise Stability", category: "scenario" },
  { slug: "cn-payment-friendly", nameZh: "国内付款友好", nameEn: "CN Payment Friendly", category: "region" },
  { slug: "beginner-friendly", nameZh: "新手易用", nameEn: "Beginner Friendly", category: "audience" },
  { slug: "open-source-deployable", nameZh: "开源可部署", nameEn: "Open Source Deployable", category: "scenario" },
];
