"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Point {
  date: string;
  value: number;
}

export function PriceTrendChart({ data, field }: { data: Point[]; field: "input" | "output" }) {
  if (data.length === 0) {
    return <div className="text-xs text-slate-500 text-center py-6">暂无历史价格数据</div>;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
          <Tooltip
            contentStyle={{
              background: "rgba(13, 19, 36, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number) => [`$${v.toFixed(3)} / 1M`, field === "input" ? "输入" : "输出"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={field === "input" ? "#4F7CFF" : "#22D3EE"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
