import { listActivePromotions, listProviders } from "@/lib/db/queries";
import { PromotionCard } from "@/components/promotion-card";
import { Tag as TagIcon } from "lucide-react";

export const revalidate = 300;

export default async function PromotionsPage() {
  const [promotions, providers] = await Promise.all([listActivePromotions(50), listProviders()]);
  const providerById = new Map(providers.map((p) => [p.id, p]));

  // 按 provider 分组
  const byProvider = new Map<string, typeof promotions>();
  for (const p of promotions) {
    const provider = providerById.get(p.provider_id);
    const key = provider?.slug ?? p.provider_slug;
    if (!byProvider.has(key)) byProvider.set(key, []);
    byProvider.get(key)!.push(p);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-warning" /> 优惠聚合
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          收录各家厂商的新用户赠送、限时折扣、量价优惠等。所有优惠都标注来源链接。
        </p>
      </header>

      {Array.from(byProvider.entries()).map(([slug, items]) => (
        <section key={slug}>
          <h2 className="text-sm font-semibold text-white mb-3">{items[0].provider_name_zh}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => <PromotionCard key={p.id} p={p as never} />)}
          </div>
        </section>
      ))}

      {promotions.length === 0 && (
        <div className="glass p-10 text-center text-sm text-slate-500">
          暂未抓取到优惠数据。运行 worker 抓取后会自动展示。
        </div>
      )}
    </div>
  );
}
