import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI模型推荐助手",
  description: "按使用场景、能力、新鲜度、来源可信度、国内/海外渠道和价格权重推荐 AI API 模型，并给出替代方案。",
  alternates: { canonical: "/recommend" },
};

export default function RecommendLayout({ children }: { children: React.ReactNode }) {
  return children;
}
