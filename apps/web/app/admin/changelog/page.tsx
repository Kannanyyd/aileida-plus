import { db } from "@/lib/db/client";
import { priceChangeLog, models, providers } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { relativeTime } from "@/lib/utils";

export const revalidate = 30;

export default async function ChangelogPage() {
  const rows = await db
    .select({
      id: priceChangeLog.id,
      field: priceChangeLog.field,
      old_value: priceChangeLog.old_value,
      new_value: priceChangeLog.new_value,
      change_pct: priceChangeLog.change_pct,
      detected_at: priceChangeLog.detected_at,
      model_name: models.name,
      model_slug: models.slug,
      provider_slug: providers.slug,
    })
    .from(priceChangeLog)
    .innerJoin(models, eq(models.id, priceChangeLog.model_id))
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .orderBy(desc(priceChangeLog.detected_at))
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">价格变更历史</h1>
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 text-[11px] text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">模型</th>
              <th className="text-left px-4 py-2.5">字段</th>
              <th className="text-right px-4 py-2.5">原值</th>
              <th className="text-right px-4 py-2.5">新值</th>
              <th className="text-right px-4 py-2.5">变化</th>
              <th className="text-right px-4 py-2.5">时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-8 text-xs">
                  暂无变更记录
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const pct = r.change_pct != null ? Number(r.change_pct) : 0;
                const down = pct < 0;
                return (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/3">
                    <td className="px-4 py-2 text-white">{r.provider_slug} · {r.model_name}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs font-mono">{r.field}</td>
                    <td className="px-4 py-2 text-right text-slate-500 font-mono text-xs">
                      {r.old_value != null ? Number(r.old_value).toFixed(4) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right text-white font-mono">
                      {r.new_value != null ? Number(r.new_value).toFixed(4) : "—"}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono text-xs ${down ? "text-success" : "text-danger"}`}>
                      {pct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 text-xs">{relativeTime(r.detected_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
