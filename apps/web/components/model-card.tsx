"use client";

import Link from "next/link";
import type { ModelWithPricing } from "@/lib/db/queries";
import { formatCny, formatContext, formatUsd, relativeTime } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import { Tag } from "./tag";

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
  const inUsd = m.input_per_1m_usd;
  const outUsd = m.output_per_1m_usd;
  const conf = m.confidence_score;
  const variant = m.need_manual_review ? "review" : conf >= 0.85 ? "official" : conf >= 0.7 ? "multi-source" : "third-party";

  return (
    <Link
      href={`/models/${encodeURIComponent(m.model_slug)}`}
      className="glass p-5 flex flex-col gap-4 hover:border-primary/40 transition group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-base text-white truncate group-hover:text-primary transition">
            {m.model_name}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{m.provider_name_zh}</p>
        </div>
        <ConfidenceBadge variant={variant as never} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">输入 / 1M tokens</p>
          <p className="font-mono text-sm text-white">{formatUsd(inUsd)}</p>
          <p className="font-mono text-[11px] text-slate-500 mt-0.5">{formatCny(inUsd)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">输出 / 1M tokens</p>
          <p className="font-mono text-sm text-white">{formatUsd(outUsd)}</p>
          <p className="font-mono text-[11px] text-slate-500 mt-0.5">{formatCny(outUsd)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <span className="text-slate-500">上下文：<span className="font-mono text-slate-300">{formatContext(m.context_length)}</span></span>
        {m.capabilities?.slice(0, 3).map((c) => (
          <Tag key={c} variant="primary">
            {CAP_LABEL[c] ?? c}
          </Tag>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
        <span>更新 {relativeTime(m.updated_at)}</span>
        <a
          href={m.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hover:text-primary truncate max-w-[60%]"
        >
          {m.primary_source_id}
        </a>
      </div>
    </Link>
  );
}
