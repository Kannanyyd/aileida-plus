import Link from "next/link";
import { cn } from "@/lib/utils";
import { Radar, Calculator, Trophy, Tag, Database, Sparkles, Newspaper, Gem } from "lucide-react";

const items = [
  { href: "/models", label: "模型库", icon: Database },
  { href: "/recommend", label: "推荐", icon: Sparkles },
  { href: "/calculator", label: "计算器", icon: Calculator },
  { href: "/rankings", label: "排行榜", icon: Trophy },
  { href: "/promotions", label: "优惠", icon: Tag },
  { href: "/plans", label: "会员", icon: Gem },
  { href: "/ai-news", label: "动态", icon: Newspaper },
  { href: "/providers", label: "厂商", icon: Radar },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-main/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center shadow-glow">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base gradient-text">AI 模型价格雷达</span>
            <span className="text-[10px] text-slate-500 -mt-0.5">ModelPrice Radar</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition"
          >
            后台
          </Link>
        </div>
      </div>
    </header>
  );
}
