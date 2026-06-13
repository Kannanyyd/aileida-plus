import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface Change {
  id: string;
  model_name: string;
  provider_slug: string;
  field: string;
  old_value: number | null;
  new_value: number | null;
  change_pct: number | null;
  detected_at: Date;
}

const FIELD_LABEL: Record<string, string> = {
  input_per_1m_usd: "输入价",
  output_per_1m_usd: "输出价",
  input_cached_read_per_1m_usd: "缓存读",
  input_cached_write_per_1m_usd: "缓存写",
};

export function PriceChangeList({ changes }: { changes: Change[] }) {
  if (changes.length === 0) {
    return (
      <div className="glass p-6 text-center text-sm text-slate-500">暂无价格变化</div>
    );
  }
  return (
    <ul className="space-y-2">
      {changes.map((c) => {
        const down = (c.change_pct ?? 0) < 0;
        return (
          <li key={c.id} className="glass p-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/models/${encodeURIComponent(c.provider_slug + "/" + c.model_name)}`}
                className="text-sm text-white font-medium hover:text-primary truncate block"
              >
                {c.provider_slug} · {c.model_name}
              </Link>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {FIELD_LABEL[c.field] ?? c.field} · {relativeTime(c.detected_at)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="font-mono text-xs text-slate-500 line-through">
                  {c.old_value?.toFixed(3) ?? "—"}
                </p>
                <p className={`font-mono text-sm font-semibold ${down ? "text-success" : "text-danger"}`}>
                  {c.new_value?.toFixed(3) ?? "—"}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold ${
                  down ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                }`}
              >
                {down ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {c.change_pct?.toFixed(1) ?? "—"}%
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
