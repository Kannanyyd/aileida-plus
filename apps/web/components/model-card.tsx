"use client";

import Link from "next/link";
import type { ModelWithPricing } from "@/lib/db/queries";
import { formatContext, relativeTime } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import { Tag } from "./tag";
import { PriceSourceBadges, PriceValue, SourceLink } from "./price-trust";

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

export function ModelCard({ m }: { m: ModelWithPricing }) {
  const preferCny = m.currency_native === "CNY" || m.is_domestic || m.pricing_region === "china_mainland" || m.provider_region === "cn";
  const estimatedCurrency = m.currency_native !== "CNY" && preferCny;
  const variant = m.need_manual_review ? "review" : m.confidence_score >= 0.85 ? "official" : m.confidence_score >= 0.7 ? "multi-source" : "third-party";

  return (
    <Link
      href={`/models/${encodeURIComponent(m.model_slug)}`}
      className="glass group flex min-w-0 flex-col gap-4 overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-bg-card-soft/80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base text-white truncate group-hover:text-primary transition">
            {m.model_name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {m.provider_name_zh} · {m.model_owner_provider || "模型所有者待确认"}
          </p>
        </div>
        <div className="shrink-0">
          <ConfidenceBadge variant={variant as never} />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="surface min-w-0 p-3">
          <p className="text-[11px] text-slate-500 mb-0.5">输入 / 1M tokens</p>
          <PriceValue
            usd={m.input_per_1m_usd}
            currencyNative={m.currency_native}
            nativeCny={m.currency_native === "CNY" && m.input_per_1m_usd != null ? m.input_per_1m_usd * 7.18 : null}
            estimatedCurrency={estimatedCurrency}
            preferCny={preferCny}
          />
        </div>
        <div className="surface min-w-0 p-3">
          <p className="text-[11px] text-slate-500 mb-0.5">输出 / 1M tokens</p>
          <PriceValue
            usd={m.output_per_1m_usd}
            currencyNative={m.currency_native}
            nativeCny={m.currency_native === "CNY" && m.output_per_1m_usd != null ? m.output_per_1m_usd * 7.18 : null}
            estimatedCurrency={estimatedCurrency}
            preferCny={preferCny}
          />
        </div>
      </div>

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

      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="text-slate-500">
          上下文：<span className="font-mono text-slate-300">{formatContext(m.context_length)}</span>
        </span>
        {m.capabilities?.slice(0, 3).map((capability) => (
          <Tag key={capability} variant="primary">
            {CAP_LABEL[capability] ?? capability}
          </Tag>
        ))}
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3 border-t border-white/10 pt-2 text-[11px] text-slate-500">
        <span className="shrink-0">更新 {relativeTime(m.updated_at)}</span>
        <span className="min-w-0 truncate">
          <SourceLink href={m.source_url} label={m.primary_source_id || "来源"} />
        </span>
      </div>
    </Link>
  );
}
