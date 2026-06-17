import { notFound } from "next/navigation";
import Link from "next/link";
import { getProviderBySlug, listModels } from "@/lib/db/queries";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { ModelCard } from "@/components/model-card";
import { SiteDisclaimer } from "@/components/model-strengths";
import {
  Building2, Globe, FileText, CreditCard, Users, Shield, Sparkles, Newspaper,
  Database, AlertTriangle, Info, MapPin, Calendar, ExternalLink, Layers,
} from "lucide-react";

export const revalidate = 300;

const CATEGORY_LABELS: Record<string, string> = {
  "model-vendor": "模型厂商",
  "cloud-vendor": "云厂商",
  "api-aggregator": "API 聚合平台",
  "open-source-platform": "开源模型平台",
  "app-platform": "AI 应用平台",
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  founder: "创业公司", startup: "创业公司", "big-tech": "大厂", cloud: "云厂商", institute: "研究机构",
};

function fmtConfidence(s: number | null) {
  if (s === null) return "review";
  if (s >= 0.85) return "official";
  if (s >= 0.7) return "multi-source";
  if (s >= 0.5) return "third-party";
  return "review";
}

function billingSummary(p: NonNullable<Awaited<ReturnType<typeof getProviderBySlug>>>): string {
  const parts: string[] = [];
  if (p.supports_api) parts.push("API 按 token 计费");
  if (p.supports_subscription_plan) parts.push("提供会员按月订阅");
  if (p.supports_enterprise_plan) parts.push("企业版需询价");
  if (!p.supports_api && !p.supports_subscription_plan) parts.push("暂未收录计费信息");
  if (p.supported_currencies?.length) parts.push(`币种：${p.supported_currencies.join("、")}`);
  return parts.join("；");
}

export default async function ProviderDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProviderBySlug(slug);
  if (!p) return notFound();

  const models = await listModels({ providerSlug: slug, limit: 50 });
  const conf = fmtConfidence(p.profile_confidence_score);

  return (
    <div className="space-y-8">
      {/* ===== 顶部：名称 + 元信息 + 链接 ===== */}
      <div className="glass p-6">
        <div className="flex flex-wrap items-start gap-5">
          {p.logo_url ? (
            <img src={p.logo_url} alt={p.name_zh} className="h-20 w-20 rounded-lg bg-white/5 object-contain p-2" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg brand-gradient">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{p.brand_name ?? p.name_zh}</h1>
              {p.provider_category && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {CATEGORY_LABELS[p.provider_category] ?? p.provider_category}
                </span>
              )}
              <ConfidenceBadge variant={conf} />
            </div>
            {p.legal_name && p.legal_name !== p.name_zh && (
              <p className="text-[11px] text-slate-500 mt-0.5">{p.legal_name}</p>
            )}
            {p.name_en && <p className="text-[11px] text-slate-600 mt-0.5">{p.name_en}</p>}

            {/* 元信息行 */}
            <div className="flex flex-wrap gap-3 mt-3">
              {p.headquarters && <span className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.headquarters}</span>}
              {p.founded_year && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{p.founded_year} 年</span>}
              {p.company_type && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{COMPANY_TYPE_LABELS[p.company_type] ?? p.company_type}</span>}
              {p.parent_company && <span className="text-[10px] text-slate-500">母公司：{p.parent_company}</span>}
            </div>

            {/* 链接按钮组 */}
            <div className="flex flex-wrap gap-2 mt-4">
              {p.official_website && <a href={p.official_website} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:border-white/20"><Globe className="w-3 h-3 mr-1 inline" />官网</a>}
              {p.api_docs_url && <a href={p.api_docs_url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:border-white/20"><FileText className="w-3 h-3 mr-1 inline" />API 文档</a>}
              {p.pricing_url && <a href={p.pricing_url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:border-white/20"><CreditCard className="w-3 h-3 mr-1 inline" />价格页</a>}
              {p.github_url && <a href={p.github_url} target="_blank" rel="noopener noreferrer" className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:border-white/20"><Database className="w-3 h-3 mr-1 inline" />GitHub</a>}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 固定四栏：简介 | 适合用户 | 主要产品 | 计费特点 ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 一句话简介 */}
        <div className="glass p-4">
          <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> 一句话简介
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {p.short_description ?? "该厂商信息仍在整理中，建议以官方页面为准。"}
          </p>
        </div>

        {/* 适合用户 */}
        <div className="glass p-4">
          <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan" /> 适合用户
          </h3>
          {p.suitable_users?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {p.suitable_users.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan/10 text-cyan border border-cyan/20">{s}</span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-600">暂未标注</p>
          )}
        </div>

        {/* 主要产品 */}
        <div className="glass p-4">
          <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> 主要产品
          </h3>
          {p.main_products?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {p.main_products.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{s}</span>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {p.supports_api && <p className="text-[10px] text-slate-400">· 模型 API</p>}
              {p.supports_subscription_plan && <p className="text-[10px] text-slate-400">· 会员产品</p>}
              {p.supports_enterprise_plan && <p className="text-[10px] text-slate-400">· 企业服务</p>}
              {!p.supports_api && !p.supports_subscription_plan && <p className="text-[10px] text-slate-600">暂未标注</p>}
            </div>
          )}
        </div>

        {/* 计费特点 */}
        <div className="glass p-4">
          <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-success" /> 计费特点
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">{billingSummary(p)}</p>
          {p.supports_domestic_payment && (
            <p className="text-[10px] text-success mt-1.5">✓ 支持国内付款</p>
          )}
          {p.supports_invoice && (
            <p className="text-[10px] text-success">✓ 支持发票</p>
          )}
        </div>
      </div>

      {/* ===== 厂商背景（长文） ===== */}
      {p.long_description ? (
        <div className="glass p-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-primary" /> 厂商背景
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{p.long_description}</p>
        </div>
      ) : (
        <div className="glass p-5">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 mt-px shrink-0" />
            <p className="text-xs text-slate-500">该厂商信息仍在整理中，建议以官方页面为准。</p>
          </div>
        </div>
      )}

      {/* ===== 擅长方向 ===== */}
      {p.strengths?.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> 擅长方向
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {p.strengths.map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ===== 旗下模型 ===== */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> 旗下模型
          <span className="text-xs font-normal text-slate-500">（{models.length} 个）</span>
        </h2>
        {models.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((m) => <ModelCard key={m.model_id} m={m} />)}
          </div>
        ) : (
          <div className="glass p-6 text-center text-xs text-slate-500">暂未收录该厂商的模型数据</div>
        )}
      </div>

      {/* ===== 最新动态 ===== */}
      <div className="glass p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="text-sm text-white">最新动态</span>
          <span className="text-[10px] text-slate-500 ml-1">— 查看该厂商的最新公告和变化</span>
        </div>
        <Link href={`/providers/${slug}/news`} className="text-xs text-primary hover:underline flex items-center gap-1">
          查看全部 <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* ===== 数据来源与声明 ===== */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" /> 数据来源与声明
        </h2>
        <div className="space-y-2 text-xs text-slate-400">
          <p>厂商档案可信度：<ConfidenceBadge variant={conf} /></p>
          <p>最近核验时间：{p.last_verified_at ? new Date(p.last_verified_at).toLocaleDateString("zh-CN") : "未核验"}</p>
          {p.data_source_urls?.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-slate-300 mb-1">参考来源：</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {p.data_source_urls.map((url, i) => (
                  <li key={i}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{url}</a></li>
                ))}
              </ul>
            </div>
          )}
          {p.need_manual_review && (
            <p className="text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 该厂商信息尚未完成人工核验
            </p>
          )}
        </div>
      </div>

      <SiteDisclaimer />
    </div>
  );
}
