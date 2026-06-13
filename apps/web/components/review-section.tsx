"use client";

import { useState, useCallback } from "react";
import { Filter, Star } from "lucide-react";
import { ReviewCard, ReviewDisclaimer } from "./review-card";

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

interface ReviewSummary {
  count: number;
  avgOverall: number;
  dims: Record<string, number>;
}

export function ReviewSection({
  reviews,
  summary,
  modelSlug,
}: {
  reviews: Review[];
  summary: ReviewSummary;
  modelSlug: string;
}) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "helpful">("recent");

  const filtered = reviews
    .filter((r) => !verifiedOnly || r.verified_use)
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return b.rating_overall - a.rating_overall;
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">用户点评</h3>
        <div className="flex items-center gap-3">
          {summary.count > 0 && (
            <span className="text-xs text-slate-400">
              共 {summary.count} 条 · 综合 {summary.avgOverall.toFixed(1)}
            </span>
          )}
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`text-[11px] px-2 py-1 rounded border text-slate-400 border-white/10 hover:border-white/20 ${verifiedOnly ? "bg-primary/10 text-primary border-primary/30" : ""}`}
          >
            <Filter className="w-3 h-3 inline mr-1" />
            {verifiedOnly ? "只看已验证" : "全部"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass p-8 text-center">
          <Star className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">暂无用户点评</p>
          <p className="text-[11px] text-slate-600 mt-1">成为第一个分享使用体验的用户</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.slice(0, 10).map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      <ReviewDisclaimer />
    </div>
  );
}
