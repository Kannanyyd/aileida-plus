import { db } from "@/lib/db/client";
import { userReviews, models, providers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Shield, Check, X, Eye, Flag, MessageSquare, ExternalLink } from "lucide-react";
import { Tag } from "@/components/tag";

export const revalidate = 30;

export default async function AdminReviewsPage() {
  // 所有待审核和已标记的点评
  const rows = await db
    .select({
      id: userReviews.id,
      user_id: userReviews.user_id,
      model_id: userReviews.model_id,
      model_name: models.name,
      model_slug: models.slug,
      provider_name: providers.name_zh,
      usage_scenario: userReviews.usage_scenario,
      rating_overall: userReviews.rating_overall,
      pros: userReviews.pros,
      cons: userReviews.cons,
      is_approved: userReviews.is_approved,
      is_flagged: userReviews.is_flagged,
      flag_reason: userReviews.flag_reason,
      created_at: userReviews.created_at,
    })
    .from(userReviews)
    .innerJoin(models, eq(models.id, userReviews.model_id))
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .orderBy(desc(userReviews.created_at))
    .limit(50);

  const pending = rows.filter((r) => !r.is_approved);
  const flagged = rows.filter((r) => r.is_flagged);
  const approved = rows.filter((r) => r.is_approved && !r.is_flagged);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">用户点评审核</h1>
        <p className="text-sm text-slate-400 mt-1">
          审核用户提交的点评。含攻击性、诋毁性、无依据指控的评论将被标记处理。
        </p>
      </header>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">待审核</p>
          <p className="text-2xl font-bold text-warning">{pending.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">已标记</p>
          <p className="text-2xl font-bold text-danger">{flagged.length}</p>
        </div>
        <div className="glass p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">已通过</p>
          <p className="text-2xl font-bold text-success">{approved.length}</p>
        </div>
      </div>

      {/* 待审核列表 */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-warning" /> 待审核点评
        </h2>
        {pending.length === 0 ? (
          <div className="glass p-8 text-center text-xs text-slate-500">暂无待审核点评</div>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 10).map((r) => (
              <div key={r.id} className="glass p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {r.model_name}
                      <span className="text-slate-500 ml-1 font-normal">· {r.provider_name}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {r.user_id.slice(0, 8)}*** · {r.usage_scenario} · 评分 {Number(r.rating_overall).toFixed(1)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="通过">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md bg-danger/10 text-danger hover:bg-danger/20" title="拒绝">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {r.pros && <p className="text-[11px] text-slate-300 mb-1">👍 {r.pros.slice(0, 200)}</p>}
                {r.cons && <p className="text-[11px] text-slate-400">💡 {r.cons.slice(0, 200)}</p>}
                <p className="text-[10px] text-slate-600 mt-1">{new Date(r.created_at!).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 已标记列表 */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Flag className="w-4 h-4 text-danger" /> 已标记需要处理
        </h2>
        {flagged.length === 0 ? (
          <div className="glass p-8 text-center text-xs text-slate-500">暂无已标记点评</div>
        ) : (
          <div className="space-y-2">
            {flagged.slice(0, 10).map((r) => (
              <div key={r.id} className="glass p-4 border border-danger/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {r.model_name}
                      <span className="text-slate-500 ml-1 font-normal">· {r.provider_name}</span>
                    </p>
                    <p className="text-[10px] text-danger">标记原因：{r.flag_reason ?? "违规内容"}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md bg-success/10 text-success hover:bg-success/20" title="批准">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-md bg-danger/10 text-danger hover:bg-danger/20" title="删除">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {r.pros && <p className="text-[11px] text-slate-300 mb-1">👍 {r.pros.slice(0, 200)}</p>}
                {r.cons && <p className="text-[11px] text-slate-400">💡 {r.cons.slice(0, 200)}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 审核说明 */}
      <div className="glass p-4">
        <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> 审核标准
        </h3>
        <ul className="text-[10px] text-slate-500 space-y-1 leading-relaxed">
          <li>✅ 客观、具体的使用体验反馈 → 通过</li>
          <li>⚠ 含攻击性、诋毁性或绝对化表述 → 标记</li>
          <li>⚠ 没有事实依据的负面指控 → 标记</li>
          <li>⚠ 商业推广、广告或无关内容 → 拒绝</li>
          <li>⚠ 系统自动检测到的违规内容 → 标记</li>
        </ul>
      </div>
    </div>
  );
}
