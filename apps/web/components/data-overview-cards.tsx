import { Database, Building2, TrendingDown } from "lucide-react";

interface Overview {
  providers: number;
  models: number;
  review: number;
  todayChanges: number;
  promotions: number;
}

const cards = [
  { key: "models", label: "已监控模型", icon: Database, accent: "text-primary" },
  { key: "providers", label: "已收录厂商", icon: Building2, accent: "text-cyan" },
  { key: "todayChanges", label: "价格记录变化", icon: TrendingDown, accent: "text-success" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<Overview, "models" | "providers" | "todayChanges">;
  label: string;
  icon: typeof Database;
  accent: string;
}>;

export function DataOverviewCards({ data }: { data: Overview }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = data[c.key] ?? 0;
        return (
          <div key={c.key} className="glass flex min-h-28 flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{c.label}</span>
              <span className="rounded-md bg-white/[0.04] p-2">
                <Icon className={`w-4 h-4 ${c.accent}`} />
              </span>
            </div>
            <div className="mt-auto flex items-end justify-between gap-3">
              <p className="font-mono text-3xl font-semibold leading-none text-white">{value}</p>
              <p className="pb-0.5 text-[11px] text-slate-500">实时</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
