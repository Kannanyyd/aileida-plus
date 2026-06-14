import { Database, Building2, TrendingDown, Tag } from "lucide-react";

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
  { key: "todayChanges", label: "今日价格变化", icon: TrendingDown, accent: "text-success" },
  { key: "promotions", label: "进行中优惠", icon: Tag, accent: "text-warning" },
] as const satisfies ReadonlyArray<{
  key: keyof Pick<Overview, "models" | "providers" | "todayChanges" | "promotions">;
  label: string;
  icon: typeof Database;
  accent: string;
}>;

export function DataOverviewCards({ data }: { data: Overview }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = data[c.key] ?? 0;
        return (
          <div key={c.key} className="glass p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{c.label}</span>
              <Icon className={`w-4 h-4 ${c.accent}`} />
            </div>
            <p className="font-mono text-3xl font-semibold text-white">{value}</p>
            <p className="text-[11px] text-slate-500">实时</p>
          </div>
        );
      })}
    </div>
  );
}
