import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI模型价格对比",
  description: "对比多个 AI 模型在官方 API、聚合平台和云平台上的输入、输出、缓存价格，区分国内价和按美元折算。",
  alternates: { canonical: "/compare" },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
