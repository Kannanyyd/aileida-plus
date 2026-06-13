import { listModels } from "@/lib/db/queries";
import { rank } from "@/lib/rank/score";
import { RankingTable } from "@/components/ranking-table";
import { notFound } from "next/navigation";

const PRESET_LABEL: Record<string, { title: string; subtitle: string }> = {
  overall: { title: "综合性价比榜", subtitle: "价格 40% + 上下文 20% + 能力 20% + 稳定 10% + 可信度 10%" },
  writing: { title: "中文写作模型榜", subtitle: "能力分权重更高，关注中文表达与指令遵循" },
  coding: { title: "编程模型榜", subtitle: "代码能力权重 40%，关注函数调用与代码补全" },
  "long-context": { title: "长文本模型榜", subtitle: "上下文长度权重 60%" },
  cheapest: { title: "最便宜 API 榜", subtitle: "按纯价格排序" },
  multimodal: { title: "多模态模型榜", subtitle: "支持图像 / 音频 / 视频的模型" },
  "free-tier": { title: "免费额度榜", subtitle: "按赠送额度 / 折扣率倒序" },
};

export const revalidate = 600;

export default async function RankingTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!PRESET_LABEL[type]) return notFound();
  const models = await listModels({ limit: 300 });
  const ranked = rank(models, type as never).map((r, i) => ({
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
  const meta = PRESET_LABEL[type];
  return (
    <RankingTable items={ranked as any} title={meta.title} subtitle={meta.subtitle} />
  );
}
