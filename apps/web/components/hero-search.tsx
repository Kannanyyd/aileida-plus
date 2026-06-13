"use client";
import { useState } from "react";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export function HeroSearch({ placeholder = "搜索模型、厂商或场景，例如：DeepSeek、豆包、Claude、写作模型" }: { placeholder?: string }) {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <div className="relative max-w-2xl">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
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
        className="w-full h-14 pl-12 pr-32 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
      />
      <button
        onClick={() => q.trim() && router.push(`/models?q=${encodeURIComponent(q)}`)}
        className="absolute right-2 top-2 h-10 px-4 rounded-xl brand-gradient text-white text-sm font-semibold flex items-center gap-1.5 hover:shadow-glow transition"
      >
        搜索
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        <Sparkles className="w-3 h-3" />
        试试：<code className="text-slate-300">DeepSeek</code> · <code className="text-slate-300">豆包</code> ·{" "}
        <code className="text-slate-300">Claude</code> · <code className="text-slate-300">写作</code>
      </div>
    </div>
  );
}
