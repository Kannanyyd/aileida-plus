import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Code, FileText, Gift, Globe, Image, Pen, Sparkles, Trophy, Zap } from "lucide-react";
import { RANKING_PRESETS } from "@/lib/rank/score";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "AI 模型价格排行榜 | 国内人民币价格榜与全球性价比榜",
  description:
    "按价格、能力、新鲜度、来源置信度和数据质量综合排序，查看 AI API 价格、国内人民币价格、官方价、聚合平台价和云平台价。",
};

const ICONS: Record<string, React.ReactNode> = {
  "frontier-value": <Sparkles className="h-4 w-4" />,
  "china-available": <Globe className="h-4 w-4" />,
  domestic: <Globe className="h-4 w-4" />,
  "global-official": <Globe className="h-4 w-4" />,
  coding: <Code className="h-4 w-4" />,
  "long-context": <FileText className="h-4 w-4" />,
  reasoning: <Brain className="h-4 w-4" />,
  multimodal: <Image className="h-4 w-4" />,
  "chinese-writing": <Pen className="h-4 w-4" />,
  cheapest: <Zap className="h-4 w-4" />,
  "low-cost": <Zap className="h-4 w-4" />,
  "legacy-low-cost": <Zap className="h-4 w-4" />,
  "free-tier": <Gift className="h-4 w-4" />,
};

export default function RankingsIndex() {
  const categories = Object.entries(RANKING_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    icon: ICONS[key] ?? null,
  }));

  const featured = categories.filter((category) => ["frontier-value", "domestic", "coding", "long-context"].includes(category.key));
  const rest = categories.filter((category) => !featured.some((item) => item.key === category.key));

  return (
    <div className="space-y-6">
      <header className="glass p-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Trophy className="h-5 w-5 text-primary" /> AI 模型价格排行榜
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          这里不是简单低价榜。默认榜单会隐藏旧模型和废弃模型，启用同厂商/同系列去重，并把价格、能力、新鲜度、来源置信度和数据质量一起纳入排序。
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded bg-success/10 px-2 py-1 text-success">国内榜优先原生 ¥</span>
          <span className="rounded bg-warning/10 px-2 py-1 text-warning">按美元折算会标为“仅供参考”</span>
          <span className="rounded bg-primary/10 px-2 py-1 text-primary">支持 Top 20 / 50 / 100</span>
          <span className="rounded bg-white/5 px-2 py-1 text-slate-400">精选榜限制刷屏</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((category) => (
          <Link key={category.key} href={`/rankings/${category.key}`} className="glass p-4 hover:border-primary/40 transition">
            <div className="flex items-center gap-2 text-primary">{category.icon}<span className="text-sm font-semibold text-white">{category.label}</span></div>
            <p className="mt-2 text-[11px] text-slate-500">
              {category.key === "domestic"
                ? "优先展示国内可用平台和国内价。"
                : category.key === "frontier-value"
                  ? "当前主流/前沿模型的综合性价比。"
                  : "按具体任务场景调整能力权重。"}
            </p>
          </Link>
        ))}
      </div>

      <div className="glass p-4">
        <h2 className="mb-2 text-xs font-semibold text-slate-400">更多榜单</h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {rest.map((category) => (
            <Link key={category.key} href={`/rankings/${category.key}`} className="rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-white/5 hover:text-primary transition">
              {category.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="glass p-4 text-xs text-slate-400 space-y-1">
        <p>精选榜：Top 10 同厂商和同模型家族会被限制，避免同一系列刷屏。</p>
        <p>全量榜：保留完整候选，适合研究价格细节和长尾模型。</p>
        <p>旧模型低价榜：只用于上一代/旧模型成本参考，不会混入首页和默认主力榜。</p>
      </div>
    </div>
  );
}
