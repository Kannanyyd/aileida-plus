import { db } from "@/lib/db/client";
import { scraperJobs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { relativeTime } from "@/lib/utils";

export const revalidate = 30;

export default async function SourcesPage() {
  const rows = await db.select().from(scraperJobs).orderBy(desc(scraperJobs.last_run_at)).limit(50);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">抓取源管理</h1>
      <p className="text-sm text-slate-400">
        数据抓取任务的健康度、最后运行时间、平均耗时。生产环境由 worker 通过 cron 调度。
      </p>
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 text-[11px] text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">数据源</th>
              <th className="text-left px-4 py-2.5">调度</th>
              <th className="text-left px-4 py-2.5">状态</th>
              <th className="text-right px-4 py-2.5">连续失败</th>
              <th className="text-right px-4 py-2.5">平均耗时</th>
              <th className="text-right px-4 py-2.5">上次运行</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-8 text-xs">
                  暂无抓取任务记录。运行 worker 后会自动填充。
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">{r.source_id}</td>
                  <td className="px-4 py-2 text-slate-400 font-mono text-xs">{r.schedule}</td>
                  <td className="px-4 py-2 text-slate-300">{r.last_status ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.consecutive_failures}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{r.avg_duration_ms ?? "—"} ms</td>
                  <td className="px-4 py-2 text-right text-slate-500 text-xs">{relativeTime(r.last_run_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
