import Link from "next/link";
import { Medal } from "lucide-react";
import { formatContext, formatUsd } from "@/lib/utils";

interface Rank {
  rank: number;
  model_name: string;
  provider_name_zh: string;
  provider_slug: string;
  model_slug: string;
  input_per_1m_usd: number;
  output_per_1m_usd: number;
  context_length: number | null;
  score: number;
}

const RANK_STYLES = [
  // 第 1 名
  "bg-gradient-to-r from-primary/20 to-cyan/10 border-primary/40",
  // 第 2 名
  "bg-gradient-to-r from-slate-500/15 to-slate-400/5 border-slate-400/30",
  // 第 3 名
  "bg-gradient-to-r from-orange-500/15 to-orange-400/5 border-orange-400/30",
];

const RANK_BADGES = [
  { icon: "🥇", label: "1" },
  { icon: "🥈", label: "2" },
  { icon: "🥉", label: "3" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RankingTable({ items, title, subtitle }: { items: any[]; title: string; subtitle?: string }) {
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <Link
          href="/rankings"
          className="text-xs text-primary hover:text-primary-hover flex items-center gap-1"
        >
          查看完整榜单 →
        </Link>
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 10).map((r) => {
          const top3 = r.rank <= 3;
          return (
            <li
              key={`${r.provider_slug}-${r.model_slug}`}
              className={`flex items-center gap-4 rounded-md border px-3 py-2.5 transition ${
                top3 ? RANK_STYLES[r.rank - 1] : "border-white/5 hover:bg-white/5"
              }`}
            >
              <div className="w-8 shrink-0 text-center">
                {top3 ? (
                  <span className="text-lg">{RANK_BADGES[r.rank - 1].icon}</span>
                ) : (
                  <span className="font-mono text-sm text-slate-500">{r.rank}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/models/${encodeURIComponent(r.model_slug)}`}
                  className="text-sm text-white hover:text-primary font-medium truncate block"
                >
                  {r.model_name}
                </Link>
                <p className="text-[11px] text-slate-500 truncate">{r.provider_name_zh}</p>
              </div>
              <div className="hidden md:flex items-center gap-6 shrink-0 text-right">
                <div>
                  <p className="text-[10px] text-slate-500">输入</p>
                  <p className="font-mono text-xs text-slate-300">{formatUsd(r.input_per_1m_usd)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">输出</p>
                  <p className="font-mono text-xs text-slate-300">{formatUsd(r.output_per_1m_usd)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">上下文</p>
                  <p className="font-mono text-xs text-slate-300">{formatContext(r.context_length)}</p>
                </div>
                <div className="w-12">
                  <p className="text-[10px] text-slate-500">评分</p>
                  <p className="font-mono text-sm font-semibold text-white">{r.score.toFixed(1)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
