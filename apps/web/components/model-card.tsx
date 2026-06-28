"use client";

import Link from "next/link";
import type { ModelWithPricing } from "@/lib/db/queries";
import { formatContext, relativeTime } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import { Tag } from "./tag";
import { PriceSourceBadges, PriceValue } from "./price-trust";
import { getModelTier } from "@/lib/rank/score";

const CAP_LABEL: Record<string, string> = {
  text: "文本",
  vision: "视觉",
  audio: "音频",
  video: "视频",
  "function-call": "函数调用",
  "json-mode": "JSON",
  "long-context": "长上下文",
  cache: "缓存",
  reasoning: "推理",
};

const TIER_LABEL: Record<string, { label: string; variant: "success" | "primary" | "warning" | "danger" | "cyan" | "default" }> = {
  current_frontier: { label: "最新", variant: "success" },
  current_mainstream: { label: "主力", variant: "primary" },
  previous_generation: { label: "上一代", variant: "warning" },
  legacy: { label: "旧模型", variant: "danger" },
  deprecated: { label: "已弃用", variant: "danger" },
  unknown: { label: "待确认", variant: "default" },
};

export function ModelCard({ m, familyModels = [] }: { m: ModelWithPricing; familyModels?: Parameters<typeof getModelTier>[1] }) {
  const preferCny = m.currency_native === "CNY" || m.is_domestic || m.pricing_region === "china_mainland" || m.provider_region === "cn";
  const estimatedCurrency = m.currency_native !== "CNY" && preferCny;
  const variant = m.need_manual_review ? "review" : m.confidence_score >= 0.85 ? "official" : m.confidence_score >= 0.7 ? "multi-source" : "third-party";
  const tier = getModelTier(m, familyModels);
  const tierInfo = TIER_LABEL[tier] ?? TIER_LABEL.unknown;

  return (
    <Link
      href={`/models/${encodeURIComponent(m.model_slug)}`}
      className="glass glass-hover group flex min-w-0 flex-col gap-3 overflow-hidden p-5"
    >
      {/* 头部：模型名 + 标签 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white group-hover:text-primary transition">
            {m.model_name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {m.provider_name_zh}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ConfidenceBadge variant={variant as never} />
          {tier !== "unknown" && <Tag variant={tierInfo.variant}>{tierInfo.label}</Tag>}
        </div>
      </div>

      {/* 价格区 */}
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[10px] text-slate-500">输入 / 1M</p>
          <PriceValue
            usd={m.input_per_1m_usd}
            currencyNative={m.currency_native}
            nativeCny={m.input_per_1m_cny}
            estimatedCurrency={estimatedCurrency}
            preferCny={preferCny}
          />
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[10px] text-slate-500">输出 / 1M</p>
          <PriceValue
            usd={m.output_per_1m_usd}
            currencyNative={m.currency_native}
            nativeCny={m.output_per_1m_cny}
            estimatedCurrency={estimatedCurrency}
            preferCny={preferCny}
          />
        </div>
      </div>

      {/* 来源标签 */}
      <PriceSourceBadges
        channel={m.channel}
        isOfficial={m.is_official}
        isAggregator={m.is_aggregator}
        isDomestic={m.is_domestic || m.provider_region === "cn"}
        currencyNative={m.currency_native}
        estimatedCurrency={estimatedCurrency}
        confidence={m.confidence_score}
        flags={m.data_quality_flags}
      />

      {/* 能力标签 */}
      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className="text-slate-500">
          <span className="font-mono text-slate-400">{formatContext(m.context_length)}</span>
        </span>
        {m.capabilities?.slice(0, 3).map((capability) => (
          <Tag key={capability} variant="primary">
            {CAP_LABEL[capability] ?? capability}
          </Tag>
        ))}
      </div>

      {/* 底部 */}
      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/5 pt-2.5 text-[10px] text-slate-500">
        <span className="shrink-0">{relativeTime(m.updated_at)}</span>
        <span className="min-w-0 truncate text-primary/70">
          {m.source_url && m.source_url !== "unknown" ? (m.primary_source_id || "来源") : "来源待确认"}
        </span>
      </div>
    </Link>
  );
}
