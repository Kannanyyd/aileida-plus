import { RANKING_PRESETS } from "@/lib/rank/score";
import { RankingTable } from "@/components/ranking-table";
import Link from "next/link";
import { Trophy, Sparkles, Globe, Code, FileText, Brain, Image, Pen, Zap, Gift } from "lucide-react";

export const revalidate = 600;

const ICONS: Record<string, React.ReactNode> = {
  "frontier-value": <Sparkles className="w-4 h-4" />,
  "china-available": <Globe className="w-4 h-4" />,
  "global-official": <Globe className="w-4 h-4" />,
  "coding": <Code className="w-4 h-4" />,
  "long-context": <FileText className="w-4 h-4" />,
  "reasoning": <Brain className="w-4 h-4" />,
  "multimodal": <Image className="w-4 h-4" />,
  "chinese-writing": <Pen className="w-4 h-4" />,
  "cheapest": <Zap className="w-4 h-4" />,
  "free-tier": <Gift className="w-4 h-4" />,
};

export default function RankingsIndex() {
  const categories = Object.entries(RANKING_PRESETS).map(([key, p]) => ({
    key, label: p.label, icon: ICONS[key] ?? null,
  }));

  const featured = categories.filter((c) =>
    ["frontier-value", "china-available", "coding", "long-context"].includes(c.key)
  );
  const rest = categories.filter((c) => !["frontier-value", "china-available", "coding", "long-context"].includes(c.key));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> AI 模型排行榜
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          12 个维度榜单 · 厂商多样性去重 · 支持 Top 50/100 · 精选/全量双模式
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {featured.map((c) => (
          <Link key={c.key} href={`/rankings/${c.key}`}
            className="glass p-3 hover:border-primary/40 transition flex items-center gap-2">
            <span className="text-primary">{c.icon}</span>
            <span className="text-sm font-semibold text-white">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="glass p-4">
        <h2 className="text-xs font-semibold text-slate-400 mb-2">更多榜单</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {rest.map((c) => (
            <Link key={c.key} href={`/rankings/${c.key}`}
              className="text-xs text-slate-300 hover:text-primary py-1.5 px-2 rounded hover:bg-white/5 transition">
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="glass p-4 text-xs text-slate-400 space-y-1">
        <p>✅ 默认精选榜：同一厂商最多 5 个模型、同一家族最多 3 个，保证多样性</p>
        <p>⬇️ 点击榜单标题旁按钮可切换「全量榜」（不限厂商数量）</p>
        <p>🔄 支持 Top 20 / Top 50 / Top 100，URL 参数切换</p>
      </div>
    </div>
  );
}
