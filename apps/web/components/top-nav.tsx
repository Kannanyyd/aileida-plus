import Link from "next/link";
import { cn } from "@/lib/utils";
import { Radar, Calculator, Trophy, Database, Sparkles, Layers } from "lucide-react";

const items = [
  { href: "/models", label: "模型库", icon: Database },
  { href: "/platform-compare", label: "平台比价", icon: Layers },
  { href: "/recommend", label: "推荐", icon: Sparkles },
  { href: "/calculator", label: "计算器", icon: Calculator },
  { href: "/rankings", label: "排行榜", icon: Trophy },
  { href: "/providers", label: "厂商", icon: Radar },
];

export function TopNav() {
  const nav = (
    <>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white",
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {it.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg-main/88 backdrop-blur-xl">
      <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md brand-gradient shadow-glow">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base gradient-text">AI 模型价格雷达</span>
            <span className="text-[10px] text-slate-500 -mt-0.5">ModelPrice Radar</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-1 md:flex">
          {nav}
        </nav>

        <div className="hidden md:block w-8" aria-hidden="true" />
      </div>
      <nav className="overflow-x-auto border-t border-white/10 px-3 py-2 md:hidden">
        <div className="flex min-w-max items-center gap-1 rounded-lg bg-white/[0.03] p-1">
          {nav}
        </div>
      </nav>
    </header>
  );
}
