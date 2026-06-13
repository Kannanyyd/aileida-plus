import { db } from "@/lib/db/client";
import { reviewQueue, providers, models } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Check, X, Eye } from "lucide-react";
import { Tag } from "@/components/tag";

export const revalidate = 30;

export default async function AdminPage() {
  const rows = await db
    .select({
      id: reviewQueue.id,
      entity_type: reviewQueue.entity_type,
      reason: reviewQueue.reason,
      status: reviewQueue.status,
      payload: reviewQueue.payload,
      conflicts: reviewQueue.conflicts,
      created_at: reviewQueue.created_at,
    })
    .from(reviewQueue)
    .orderBy(desc(reviewQueue.created_at))
    .limit(50);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">后台 · 人工复核</h1>
        <p className="text-sm text-slate-400 mt-1">
          低置信度、多源冲突、字段异常的数据会进入这里。审核通过后才会被前端展示。
        </p>
      </header>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 text-[11px] text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">实体</th>
              <th className="text-left px-4 py-2.5">原因</th>
              <th className="text-left px-4 py-2.5">状态</th>
              <th className="text-left px-4 py-2.5">创建时间</th>
              <th className="text-right px-4 py-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-10 text-xs">
                  暂无待审数据
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/3">
                  <td className="px-4 py-2.5 text-white">{r.entity_type}</td>
                  <td className="px-4 py-2.5">
                    <Tag variant="warning">{r.reason}</Tag>
                  </td>
                  <td className="px-4 py-2.5">
                    <Tag variant={r.status === "pending" ? "warning" : "success"}>{r.status}</Tag>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">
                    {r.created_at?.toString().slice(0, 19) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <button className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300" title="查看">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="通过">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md bg-danger/10 text-danger hover:bg-danger/20" title="拒绝">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
