"use client";

import { useState } from "react";
import { Star, CheckCircle, AlertTriangle, User, Calendar, Tag } from "lucide-react";

interface Review {
  id: string;
  user_id: string;
  usage_scenario: string;
  usage_intensity: string;
  rating_price: number;
  rating_chinese: number;
  rating_code: number;
  rating_reasoning: number;
  rating_speed: number;
  rating_stability: number;
  rating_api_ease: number;
  rating_docs_clarity: number;
  rating_payment: number;
  rating_overall: number;
  pros: string;
  cons: string;
  suitable_for: string[];
  not_suitable_for: string[];
  verified_use: boolean;
  created_at: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  rating_price: "价格满意度",
  rating_chinese: "中文效果",
  rating_code: "代码能力",
  rating_reasoning: "推理能力",
  rating_speed: "响应速度",
  rating_stability: "稳定性",
  rating_api_ease: "API 易用性",
  rating_docs_clarity: "文档清晰度",
  rating_payment: "付款便利性",
  rating_overall: "综合体验",
};

const INTENSITY_LABELS: Record<string, string> = {
  low: "低频（测试/偶尔）",
  medium: "中频（每日调用）",
  high: "高频（大量调用）",
  enterprise: "企业级",
};

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-slate-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-slate-300 w-5 text-right font-mono">{value}</span>
    </div>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);

  // 只展示前 6 个维度
  const dims = Object.keys(DIMENSION_LABELS)
    .filter((k) => review[k as keyof Review] != null)
    .slice(0, 6);

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{review.user_id.slice(0, 8)}***</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Star className="w-3 h-3 text-warning fill-warning" />
              <span className="text-xs font-semibold text-white">{review.rating_overall}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {review.verified_use && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded">
              <CheckCircle className="w-2.5 h-2.5" /> 已验证
            </span>
          )}
          <span className="text-[10px] text-slate-500">
            {review.created_at.slice(0, 10)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
          {review.usage_scenario}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
          {INTENSITY_LABELS[review.usage_intensity] ?? review.usage_intensity}
        </span>
      </div>

      <div className="space-y-1">
        {dims.map((k) => (
          <RatingBar key={k} label={DIMENSION_LABELS[k]} value={review[k as keyof Review] as number} />
        ))}
      </div>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          {review.pros && (
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-1">优点</p>
              <p className="text-xs text-slate-300 leading-relaxed">{review.pros}</p>
            </div>
          )}
          {review.cons && (
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-1">注意点</p>
              <p className="text-xs text-slate-300 leading-relaxed">{review.cons}</p>
            </div>
          )}
          {review.suitable_for.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-1">比较适合</p>
              <div className="flex flex-wrap gap-1">
                {review.suitable_for.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">{s}</span>
                ))}
              </div>
            </div>
          )}
          {review.not_suitable_for.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-slate-400 mb-1">用户反馈的注意点</p>
              <div className="flex flex-wrap gap-1">
                {review.not_suitable_for.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] text-primary hover:text-primary-hover"
      >
        {expanded ? "收起" : "展开详情"}
      </button>
    </div>
  );
}

export function ReviewDisclaimer() {
  return (
    <p className="text-[10px] text-slate-600 leading-relaxed mt-2 px-1">
      用户点评仅代表个人使用体验，可能受到使用场景、提示词、调用方式、网络环境、版本变化等因素影响。本站不对单条点评的完整性、准确性或适用性作绝对保证，建议用户结合自身需求进行测试和选择。
    </p>
  );
}
