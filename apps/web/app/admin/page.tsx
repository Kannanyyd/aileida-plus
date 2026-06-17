import Link from "next/link";
import { ShieldCheck, FileClock, Database, MessageSquare, Settings, Building2 } from "lucide-react";

const cards = [
  { href: "/admin/review", title: "数据复核台", desc: "处理低置信度 / 多源冲突 / 字段异常的数据", icon: ShieldCheck },
  { href: "/admin/reviews", title: "用户点评审核", desc: "审核用户提交的点评内容，处理违规和已标记评论", icon: MessageSquare },
  { href: "/admin/providers", title: "厂商管理", desc: "管理 AI 厂商资料、数据源、Logo、背景介绍", icon: Building2 },
  { href: "/admin/sources", title: "抓取源管理", desc: "查看各源健康度、调度、失败次数", icon: Database },
  { href: "/admin/changelog", title: "价格变更历史", desc: "所有自动 / 人工应用的价格变更记录", icon: FileClock },
];

export default function AdminIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">后台管理</h1>
        <p className="text-sm text-slate-400 mt-1">所有运营动作的入口。</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="glass p-5 flex items-start gap-3 hover:border-primary/40 transition">
              <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{c.title}</p>
                <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="glass p-4">
        <h3 className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" /> 数据完整性要求
        </h3>
        <ul className="text-[11px] text-slate-500 space-y-1">
          <li>每条价格数据必须带 source_url、source_snapshot、confidence_score</li>
          <li>多源冲突数据进入复核队列，不会自动覆写已审核价格</li>
          <li>source_url 不可为空（数据库 CHECK 约束防护）</li>
          <li>用户点评需审核后展示，明显违规内容自动标记</li>
        </ul>
      </div>
    </div>
  );
}
