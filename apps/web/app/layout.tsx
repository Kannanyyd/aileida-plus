import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 模型价格雷达 | 实时追踪 AI 模型价格、优惠和性价比",
  description:
    "自动监控国内外主流 AI 模型价格、免费额度、上下文长度和最新优惠，帮你找到最适合、最划算的模型。",
  openGraph: {
    title: "AI 模型价格雷达",
    description: "实时追踪 AI 模型价格、优惠和性价比",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-bg-main text-slate-200 antialiased">
        <div className="relative">
          <div className="absolute inset-0 bg-dark-radial pointer-events-none" />
          <div className="relative">
            <TopNav />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
            <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-12 mt-12 border-t border-white/5 text-xs text-slate-500">
              <div className="flex flex-wrap gap-4 justify-between">
                <div>
                  <p>AI 模型价格雷达 · ModelPrice Radar</p>
                  <p className="mt-1 text-slate-600">
                    数据来源于公开渠道。所有价格以 USD/百万 tokens 为单位展示。
                  </p>
                </div>
                <div className="flex gap-4">
                  <a href="/providers" className="hover:text-primary">厂商</a>
                  <a href="/promotions" className="hover:text-primary">优惠</a>
                  <a href="/rankings" className="hover:text-primary">排行榜</a>
                  <a href="/admin" className="hover:text-primary">后台</a>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
