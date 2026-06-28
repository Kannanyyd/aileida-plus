"use client";
import { useState } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function HeroSearch({ placeholder = "搜索模型、厂商或场景，例如：DeepSeek、豆包、Claude、写作模型" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <div className="relative w-full max-w-2xl">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && q.trim()) router.push(`/models?q=${encodeURIComponent(q)}`);
        }}
        placeholder={placeholder}
        className="h-[52px] w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-28 text-sm text-white shadow-inner shadow-black/20 transition placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 sm:h-14 sm:pr-32"
      />
      <button
        onClick={() => q.trim() && router.push(`/models?q=${encodeURIComponent(q)}`)}
        className="absolute right-1.5 top-1.5 flex h-10 items-center gap-1.5 rounded-lg brand-glow px-3 text-sm font-semibold text-white sm:right-2 sm:top-2 sm:px-4"
      >
        搜索
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-600">
        <Sparkles className="w-3 h-3" />
        试试：<code className="text-slate-500">DeepSeek</code> · <code className="text-slate-500">豆包</code> ·{" "}
        <code className="text-slate-500">Claude</code> · <code className="text-slate-500">写作</code>
      </div>
    </div>
  );
}
