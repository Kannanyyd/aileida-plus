import Link from "next/link";
import { Shield, Info, CreditCard, Users, Building2 } from "lucide-react";
import { listSubscriptionPlans } from "@/lib/db/queries";

export const revalidate = 600;

function formatPrice(amount: string | number | null, currency: string): string {
  if (amount === null) return "询价";
  const v = Number(amount);
  if (v === 0) return "免费";
  if (currency === "CNY") return `¥${v}/月`;
  return `$${v}/mo`;
}

export default async function PlansPage() {
  const rows = await listSubscriptionPlans();

  // 按 provider 分组
  const byProvider = new Map<string, { name: string; slug: string; plans: typeof rows }>();
  for (const r of rows) {
    if (!byProvider.has(r.provider_id)) byProvider.set(r.provider_id, { name: r.provider_name, slug: r.provider_slug, plans: [] });
    byProvider.get(r.provider_id)!.plans.push(r);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">会员 / Plan 对比</h1>
        <p className="text-sm text-slate-400 mt-1">
          各 AI 平台的会员方案、订阅价格和权益对比。会员/Plan 价格与 API token 价格独立展示，不做混排。
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">💡 本页展示的是 Chat/Web 端会员价，不是 API 调用价</span>
          <Link href="/calculator" className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20">→ 查看 API token 价格</Link>
        </div>
      </header>

      {byProvider.size === 0 ? (
        <div className="glass p-12 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500">暂无会员/Plan 数据</p>
          <p className="text-[11px] text-slate-600">数据库中的 subscription_plans 表为空，需通过后台或 seed 填充</p>
        </div>
      ) : (
        [...byProvider.entries()].map(([id, { name, slug, plans }]) => (
          <section key={id}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-white">{name}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {plans.map((plan) => (
                <div key={plan.id} className="glass p-5 relative">
                  {(plan.tier === "pro" || plan.tier === "plus") && (
                    <span className="absolute -top-2 right-3 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-cyan text-white font-medium">推荐</span>
                  )}
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <div className="mt-2 mb-3">
                    <span className="text-2xl font-bold text-white">{formatPrice(plan.monthly_price, plan.currency)}</span>
                    {plan.annual_price != null && Number(plan.annual_price) > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5">年付 {formatPrice(plan.annual_price, plan.currency)}</p>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    {(plan.features as string[] ?? []).slice(0, 4).map((f: string, i: number) => (
                      <p key={i}>✓ {f}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="glass p-5 space-y-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-500 mt-px shrink-0" />
          <div className="text-[11px] text-slate-500 space-y-2 leading-relaxed">
            <p>会员/Plan 价格与 API token 价格是两种不同的计费方式。本页展示的是各平台 Chat/Web 端的会员订阅价格，不包含 API 调用费用。</p>
            <p>如需评估 API 调用成本，请使用 <Link href="/calculator" className="text-primary hover:underline">价格计算器</Link>。</p>
            <p>以上信息基于各平台官方页面公开信息整理，实际价格和权益以官方最新公告为准。</p>
          </div>
        </div>
      </div>

      <div className="glass p-4">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-slate-500 mt-px shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            本站展示的会员/Plan 信息基于公开资料和官方页面整理，仅供参考。实际价格、功能和权益以各厂商官方页面为准。本站不隶属于相关服务商。
          </p>
        </div>
      </div>
    </div>
  );
}
