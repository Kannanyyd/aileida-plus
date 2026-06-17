import Link from "next/link";
import { db } from "@/lib/db/client";
import { providers } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Plus, Settings, ExternalLink, AlertTriangle, Check, X, Database, Globe, Users } from "lucide-react";
import { ConfidenceBadge } from "@/components/confidence-badge";

export const revalidate = 30;

function fmtConfidence(score: string | number | null): "official" | "multi-source" | "third-party" | "review" {
  const s = score != null ? Number(score) : 0;
  if (s >= 0.85) return "official";
  if (s >= 0.7) return "multi-source";
  if (s >= 0.5) return "third-party";
  return "review";
}

export default async function AdminProvidersPage() {
  const rows = await db
    .select()
    .from(providers)
    .orderBy(desc(providers.updated_at))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <header>
          <h1 className="text-2xl font-bold text-white">厂商管理</h1>
          <p className="text-sm text-slate-400 mt-1">
            管理 AI 厂商资料、数据源配置和背景信息。架构支持持续扩展，不限数量。
          </p>
        </header>
        <button className="px-4 py-2 rounded-xl brand-gradient text-white text-sm font-semibold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> 新增厂商
        </button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "总数", value: rows.length, color: "text-white" },
          { label: "激活", value: rows.filter((r) => r.is_active).length, color: "text-success" },
          { label: "待复核", value: rows.filter((r) => r.need_manual_review).length, color: "text-warning" },
          { label: "国内", value: rows.filter((r) => r.region === "cn").length, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="glass p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 表格 */}
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/3 text-[11px] text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">厂商</th>
              <th className="text-left px-4 py-2.5">类型</th>
              <th className="text-left px-4 py-2.5">可链接</th>
              <th className="text-left px-4 py-2.5">可信度</th>
              <th className="text-left px-4 py-2.5">状态</th>
              <th className="text-right px-4 py-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const urls = [
                r.official_website, r.api_docs_url, r.pricing_url, r.github_url,
              ].filter(Boolean).length;
              return (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/3">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] text-slate-400">
                        <Database className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-white">{r.brand_name ?? r.name_zh}</p>
                        <p className="text-[10px] text-slate-500">{r.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[10px] text-slate-400">
                    {r.provider_category ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[10px]">
                    <span className={`${urls >= 3 ? "text-success" : urls >= 1 ? "text-warning" : "text-slate-600"}`}>
                      {urls} 个
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <ConfidenceBadge variant={fmtConfidence(r.profile_confidence_score)} />
                  </td>
                  <td className="px-4 py-2.5">
                    {r.is_active ? (
                      <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded">激活</span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">停用</span>
                    )}
                    {r.need_manual_review && (
                      <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded ml-1">
                        待复核
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <Link href={`/providers/${r.slug}`} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400" title="查看前台">
                        <Globe className="w-3.5 h-3.5" />
                      </Link>
                      <button className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400" title="编辑">
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 新厂商发现说明 */}
      <div className="glass p-4">
        <p className="text-[11px] text-slate-400 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" /> 新厂商发现与审核
        </p>
        <div className="text-[10px] text-slate-500 space-y-1.5 leading-relaxed">
          <p>系统会定期搜索和识别新的 AI 模型厂商、API 聚合平台和云厂商。</p>
          <p>疑似新厂商将进入人工复核队列，包含以下来源：</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>OpenRouter / LiteLLM 新收录 model provider 前缀</li>
            <li>GitHub 新模型项目主页</li>
            <li>HuggingFace / ModelScope 新发布模型</li>
            <li>科技媒体和行业报告中提及的新厂商</li>
          </ul>
          <p className="text-warning">新厂商未经人工审核不会自动上线。每项信息都必须有来源链接。</p>
        </div>
      </div>

      {/* 数据源自动关联说明 */}
      <div className="glass p-4">
        <p className="text-[11px] text-slate-400 flex items-center gap-2 mb-2">
          <Users className="w-3.5 h-3.5 text-cyan" /> 扩展机制
        </p>
        <div className="text-[10px] text-slate-500 space-y-1">
          <p>每个厂商可配置多个数据源类型：</p>
          <p>官方价格页 · 模型列表页 · API 文档 · 公告页 · 博客 · 更新日志 · RSS/Sitemap · GitHub/Gitee/ModelScope</p>
          <p>新增厂商后，抓取系统会自动创建对应的抓取任务。</p>
        </div>
      </div>
    </div>
  );
}
