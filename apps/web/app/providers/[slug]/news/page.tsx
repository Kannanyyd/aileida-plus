import Link from "next/link";
import { notFound } from "next/navigation";
import { getProviderBySlug } from "@/lib/db/queries";
import { listNewsItems } from "@/lib/db/queries";
import { ExternalLink, Calendar, Newspaper } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/news-constants";

export const revalidate = 300;

export default async function ProviderNewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProviderBySlug(slug);
  if (!p) return notFound();

  const rows = await listNewsItems({ providerId: p.id, limit: 20 });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-slate-500 mb-1">
          <Link href="/providers" className="hover:text-primary">厂商</Link> / {p.name_zh}
        </p>
        <h1 className="text-2xl font-bold text-white">{p.brand_name ?? p.name_zh} · 动态</h1>
        <p className="text-sm text-slate-400 mt-1">最新公告、价格变化和功能更新</p>
      </header>

      {rows.length === 0 ? (
        <div className="glass p-12 text-center space-y-2">
          <Newspaper className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500">暂无该厂商的动态</p>
          <p className="text-[11px] text-slate-600">新闻源初始化后会自动展示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <div key={n.id} className="glass p-4 hover:border-primary/30 transition">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{CATEGORY_LABELS[n.category]?.icon ?? "📋"}</span>
                <div className="flex-1">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-white hover:text-primary">
                    {n.title} <ExternalLink className="w-3 h-3 inline text-slate-600" />
                  </a>
                  {n.summary && <p className="text-xs text-slate-400 mt-1">{n.summary}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{CATEGORY_LABELS[n.category]?.zh}</span>
                    {n.published_at && <span className="text-[10px] text-slate-600">{new Date(n.published_at).toLocaleDateString("zh-CN")}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass p-4 text-[10px] text-slate-500 leading-relaxed">
        以上动态基于公开来源整理，仅供参考。原始信息以厂商官方公告为准。
      </div>
    </div>
  );
}
