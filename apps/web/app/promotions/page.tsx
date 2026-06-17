import Link from "next/link";
import { Calendar, Clock, ExternalLink, Newspaper, RadioTower, Tag } from "lucide-react";
import { listVendorAnnouncements } from "@/lib/db/queries";
import { CATEGORY_LABELS } from "@/lib/news-constants";

export const revalidate = 60;

function formatDate(value: Date | string | null) {
  if (!value) return "本次采集";
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function PromotionsPage() {
  const announcements = await listVendorAnnouncements(80);

  const byProvider = new Map<string, typeof announcements>();
  for (const item of announcements) {
    const key = item.provider_slug;
    if (!byProvider.has(key)) byProvider.set(key, []);
    byProvider.get(key)!.push(item);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <RadioTower className="w-5 h-5 text-primary" /> 厂商公告聚合
        </h1>
        <p className="text-sm text-slate-400">
          固定抓取主流 AI 厂商官网公告、价格页和文档更新；页面按小时刷新，发布日期与本站发布时间保持一致。
        </p>
      </header>

      {Array.from(byProvider.entries()).map(([slug, items]) => (
        <section key={slug} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">{items[0].provider_name_zh}</h2>
            <Link href={`/providers/${slug}/news`} className="text-xs text-primary hover:underline">
              查看厂商动态
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const category = CATEGORY_LABELS[item.category] ?? { zh: item.category, icon: "📄" };
              const date = formatDate(item.published_at);
              return (
                <article key={item.id} className="glass p-4 flex flex-col gap-3 min-h-[190px]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {category.icon} {category.zh}
                    </span>
                    {item.affects_pricing && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning flex items-center gap-1">
                        <Tag className="w-3 h-3" /> 价格相关
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-white hover:text-primary transition leading-relaxed"
                  >
                    {item.title}
                  </a>

                  {item.summary && <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{item.summary}</p>}

                  <div className="mt-auto pt-2 border-t border-white/10 space-y-1.5 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 发布日期：{date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 本站发布：{formatDate(item.fetched_at)}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">来源：{item.source_name}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {announcements.length === 0 && (
        <div className="glass p-12 text-center space-y-2">
          <Newspaper className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500">暂无厂商公告数据</p>
          <p className="text-[11px] text-slate-600">运行 worker 或执行 npm run crawl:news 后会自动展示官网公告。</p>
        </div>
      )}
    </div>
  );
}
