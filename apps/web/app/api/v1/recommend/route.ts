import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { listModels } from "@/lib/db/queries";
import { getModelTier, freshnessScore, scoreModel, type ModelTier } from "@/lib/rank/score";
import type { RecommendInput } from "@pricing/core";

type ChannelFilter = "official_api" | "aggregator" | "cloud_platform";

interface RecommendBody extends RecommendInput {
  regionPreference?: "domestic" | "overseas" | "any";
  channelPreference?: ChannelFilter | "any";
  currencyPreference?: "CNY" | "USD" | "any";
  requireDomesticPayment?: boolean;
}

const SCENARIO_CAPS: Record<string, string[]> = {
  writing: ["json-mode", "long-context"],
  "code-generation": ["function-call", "json-mode", "code"],
  "customer-service": ["function-call", "json-mode"],
  "kb-qa": ["long-context", "json-mode"],
  "long-doc": ["long-context"],
  "image-understand": ["vision"],
  "data-analysis": ["reasoning", "json-mode"],
  agent: ["function-call", "json-mode", "reasoning"],
  translation: ["long-context"],
  education: ["reasoning"],
};

function scenarioSlug(scenario: string) {
  return scenario.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function avgPrice(m: Awaited<ReturnType<typeof listModels>>[number]) {
  return ((m.input_per_1m_usd ?? 0) + (m.output_per_1m_usd ?? 0)) / 2;
}

function estimateMonthlyCost(input: RecommendBody, m: Awaited<ReturnType<typeof listModels>>[number]) {
  const inputTokens = input.monthlyInputTokens ?? 1_000_000;
  const outputTokens = input.monthlyOutputTokens ?? 500_000;
  const cost = (inputTokens / 1_000_000) * (m.input_per_1m_usd ?? 0) + (outputTokens / 1_000_000) * (m.output_per_1m_usd ?? 0);
  return Math.round(cost * 100) / 100;
}

function tierLabel(tier: ModelTier) {
  const labels: Record<ModelTier, string> = {
    current_frontier: "当前前沿",
    current_mainstream: "当前主流",
    previous_generation: "上一代",
    legacy: "旧模型",
    deprecated: "已废弃",
    unknown: "新旧待判断",
  };
  return labels[tier];
}

function scoreRecommendation(input: RecommendBody, m: Awaited<ReturnType<typeof listModels>>[number], all: Awaited<ReturnType<typeof listModels>>) {
  const slug = scenarioSlug(input.scenario);
  const wantedCaps = new Set([...(SCENARIO_CAPS[slug] ?? []), ...(input.techRequirements ?? [])]);
  const capHits = [...wantedCaps].filter((c) => (m.capabilities ?? []).some((x) => x.includes(c) || c.includes(x))).length;
  const scenario = wantedCaps.size === 0 ? 65 : Math.min(100, (capHits / wantedCaps.size) * 100 + 20);
  const capability = scoreModel(m, all).capability;
  const freshness = freshnessScore(m);
  const confidence = m.confidence_score * 100;
  const regional =
    input.regionPreference === "domestic" || input.techRequirements?.includes("cn-accessible")
      ? (m.is_domestic || m.provider_region === "cn" || m.pricing_region === "china_mainland" ? 100 : 20)
      : input.regionPreference === "overseas"
        ? (!m.is_domestic && m.pricing_region !== "china_mainland" ? 100 : 45)
        : 70;
  const channel =
    input.channelPreference && input.channelPreference !== "any"
      ? (m.channel === input.channelPreference ? 100 : 35)
      : input.budget === "cn-payment" || input.requireDomesticPayment
        ? (m.provider_region === "cn" || m.currency_native === "CNY" ? 100 : 35)
        : 70;
  const price = scoreModel(m, all, { price: 1, context: 0, capability: 0, freshness: 0, confidence: 0 }).total;
  const priceWeight = input.budget === "cheapest" || input.budget === "free-tier" ? 0.32 : 0.12;
  const abilityWeight = input.quality === "basic" ? 0.2 : 0.25;
  const score =
    scenario * 0.25 +
    capability * abilityWeight +
    freshness * 0.2 +
    confidence * 0.1 +
    ((regional + channel) / 2) * 0.1 +
    price * priceWeight;
  return Math.round(score * 10) / 10;
}

function reasons(input: RecommendBody, m: Awaited<ReturnType<typeof listModels>>[number]) {
  const tier = getModelTier(m);
  const out = [tierLabel(tier)];
  if ((m.capabilities ?? []).includes("reasoning")) out.push("适合推理任务");
  if ((m.capabilities ?? []).includes("function-call")) out.push("支持函数调用");
  if ((m.capabilities ?? []).includes("vision")) out.push("支持图片理解");
  if ((m.context_length ?? 0) >= 128000) out.push("长上下文");
  if (m.confidence_score >= 0.85) out.push("高置信度价格来源");
  if (input.regionPreference === "domestic" || input.techRequirements?.includes("cn-accessible")) {
    if (m.provider_region === "cn" || m.is_domestic) out.push("更适合国内使用");
  }
  if (input.budget === "cheapest" && avgPrice(m) <= 0.5) out.push("成本较低");
  return out.slice(0, 5);
}

function suitability(input: RecommendBody, m: Awaited<ReturnType<typeof listModels>>[number]) {
  const suitable = [input.scenario, ...(m.capabilities ?? []).slice(0, 3)].filter(Boolean);
  const notSuitable: string[] = [];
  const tier = getModelTier(m);
  if (tier === "previous_generation" || tier === "legacy") notSuitable.push("新项目默认首选");
  if ((m.context_length ?? 0) < 32000) notSuitable.push("超长文档");
  if (!(m.capabilities ?? []).includes("vision")) notSuitable.push("视觉/多模态任务");
  if (m.confidence_score < 0.7) notSuitable.push("高可靠生产定价决策");
  return { suitableFor: suitable, notSuitableFor: notSuitable.slice(0, 3) };
}

export async function POST(req: NextRequest) {
  try {
    const body: RecommendBody = await req.json();
    if (!body.scenario) {
      return NextResponse.json({ error: "缺少必填字段：scenario" }, { status: 400 });
    }

    let models = await listModels({
      limit: 2000,
      region: body.regionPreference === "domestic" ? "china_mainland" : body.regionPreference === "overseas" ? "overseas" : undefined,
      channel: body.channelPreference && body.channelPreference !== "any" ? body.channelPreference : undefined,
    });
    if (models.length === 0) {
      return NextResponse.json({ error: "暂无模型数据" }, { status: 503 });
    }

    models = models.filter((m) => {
      const tier = getModelTier(m);
      if (body.budget !== "cheapest" && ["legacy", "deprecated", "unknown"].includes(tier)) return false;
      if (body.currencyPreference && body.currencyPreference !== "any" && m.currency_native !== body.currencyPreference) return false;
      if (body.requireDomesticPayment && m.provider_region !== "cn" && m.currency_native !== "CNY") return false;
      return !m.need_manual_review && m.confidence_score >= 0.6;
    });

    const scored = models
      .map((m) => ({ model: m, score: scoreRecommendation(body, m, models), monthlyCost: estimateMonthlyCost(body, m) }))
      .sort((a, b) => b.score - a.score);

    const byCost = [...scored].sort((a, b) => a.monthlyCost - b.monthlyCost);
    const byQuality = [...scored].sort((a, b) => freshnessScore(b.model) + scoreModel(b.model, models).capability - (freshnessScore(a.model) + scoreModel(a.model, models).capability));

    const enrich = (row: (typeof scored)[number]) => {
      const stronger = byQuality.find((x) => x.model.model_id !== row.model.model_id && x.monthlyCost >= row.monthlyCost && x.score >= row.score - 5);
      const cheaper = byCost.find((x) => x.model.model_id !== row.model.model_id && x.monthlyCost < row.monthlyCost && x.score >= row.score - 15);
      const tier = getModelTier(row.model);
      const fit = suitability(body, row.model);
      return {
        model: {
          modelName: row.model.model_name,
          providerName: row.model.provider_name_zh,
          slug: row.model.model_slug,
          inputUsd: row.model.input_per_1m_usd ?? 0,
          outputUsd: row.model.output_per_1m_usd ?? 0,
          contextLength: row.model.context_length ?? 0,
          strengths: row.model.capabilities ?? [],
          score: row.score,
          tier,
          tierLabel: tierLabel(tier),
          isLegacy: ["previous_generation", "legacy", "deprecated"].includes(tier),
          priceSourceCount: row.model.price_source_count,
        },
        monthlyCost: row.monthlyCost,
        score: row.score,
        reasons: reasons(body, row.model),
        suitableFor: fit.suitableFor,
        notSuitableFor: fit.notSuitableFor,
        strongerAlternative: stronger ? { name: stronger.model.model_name, slug: stronger.model.model_slug, monthlyCost: stronger.monthlyCost } : null,
        cheaperAlternative: cheaper ? { name: cheaper.model.model_name, slug: cheaper.model.model_slug, monthlyCost: cheaper.monthlyCost } : null,
      };
    };

    return NextResponse.json({
      budget: byCost.filter((x) => getModelTier(x.model) !== "legacy").slice(0, 2).map(enrich),
      balanced: scored.slice(0, 2).map(enrich),
      premium: byQuality.slice(0, 2).map(enrich),
      input: body,
      generatedAt: new Date().toISOString(),
      weights: {
        scenario: 0.25,
        capability: body.quality === "basic" ? 0.2 : 0.25,
        freshness: 0.2,
        confidence: 0.1,
        regionAndChannel: 0.1,
        price: body.budget === "cheapest" || body.budget === "free-tier" ? 0.32 : 0.12,
      },
    });
  } catch (e) {
    console.error("recommend API error:", e);
    return NextResponse.json({ error: "推荐计算失败" }, { status: 500 });
  }
}
