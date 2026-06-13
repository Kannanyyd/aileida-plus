"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const DEFAULT_DIMS = [
  { key: "context", label: "上下文" },
  { key: "speed", label: "速度" },
  { key: "chinese", label: "中文" },
  { key: "code", label: "编程" },
  { key: "vision", label: "多模态" },
  { key: "stability", label: "稳定" },
];

export function CapabilityRadar({
  values,
  dims = DEFAULT_DIMS,
}: {
  values: Record<string, number>;
  dims?: { key: string; label: string }[];
}) {
  const data = dims.map((d) => ({ subject: d.label, value: values[d.key] ?? 0 }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <Radar
            dataKey="value"
            stroke="#4F7CFF"
            fill="#4F7CFF"
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
