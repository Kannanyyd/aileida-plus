import { listModels } from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";
import { RankingTable } from "@/components/ranking-table";
import Link from "next/link";
import { Trophy } from "lucide-react";

export const revalidate = 600;

export default async function RankingsIndex() {
  const models = await listModels({ limit: 300 });
  const overall = rank(models, "overall").map((r, i) => ({
    rank: i + 1,
    model_name: r.model.model_name,
    model_slug: r.model.model_slug,
    provider_name_zh: r.model.provider_name_zh,
    provider_slug: r.model.provider_slug,
    input_per_1m_usd: r.model.input_per_1m_usd,
    output_per_1m_usd: r.model.output_per_1m_usd,
    context_length: r.model.context_length,
    score: r.score.total,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> 性价比排行榜
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          多个维度对比，价格透明可追溯。所有评分基于数据库实时数据。
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: "overall", label: "综合榜" },
          { key: "writing", label: "中文写作" },
          { key: "coding", label: "编程" },
          { key: "long-context", label: "长文本" },
          { key: "cheapest", label: "最便宜" },
          { key: "multimodal", label: "多模态" },
          { key: "free-tier", label: "免费额度" },
        ].map((c) => (
          <Link
            key={c.key}
            href={`/rankings/${c.key}`}
            className="glass p-3 text-center hover:border-primary/40 transition"
          >
            <p className="text-sm font-semibold text-white">{c.label}</p>
          </Link>
        ))}
      </div>

      <RankingTable
        items={overall}
        title="综合性价比榜"
        subtitle="综合价格 / 上下文 / 能力 / 稳定性 / 可信度"
      />
    </div>
  );
}
