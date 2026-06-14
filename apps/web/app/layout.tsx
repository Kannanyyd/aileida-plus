import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";

export const dynamic = "force-dynamic";

const baseUrl = process.env.APP_BASE_URL ?? "http://175.178.213.71:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "AI模型价格雷达 | ModelPrice Radar",
    template: "%s | ModelPrice Radar",
  },
  description:
    "对比国内和海外 AI API 价格，追踪官方价、聚合平台价、云平台价、人民币原生价、美元价和最新模型发现。",
  keywords: [
    "AI模型价格",
    "AI API价格",
    "大模型价格",
    "模型价格对比",
    "DeepSeek API价格",
    "通义千问 API价格",
    "Kimi API价格",
    "豆包 API价格",
    "硅基流动价格",
    "OpenAI API价格",
    "Claude API价格",
    "Gemini API价格",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "AI模型价格雷达",
    description: "国内 / 海外 AI API 价格、多渠道来源、最新模型发现和推荐选型助手。",
    type: "website",
    url: baseUrl,
    siteName: "ModelPrice Radar",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI模型价格雷达",
    description: "对比国内和海外 AI API 价格，区分官方价、聚合价、云平台价和估算价。",
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
                  <p className="text-slate-300">AI模型价格雷达 · ModelPrice Radar</p>
                  <p className="mt-1 text-slate-600">
                    价格来自公开官方文档、聚合平台、云平台和第三方数据源；估算价会明确标记，正式采购前请以来源页面为准。
                  </p>
                </div>
                <div className="flex gap-4">
                  <a href="/models" className="hover:text-primary">模型库</a>
                  <a href="/providers" className="hover:text-primary">厂商</a>
                  <a href="/rankings" className="hover:text-primary">排行榜</a>
                  <a href="/recommend" className="hover:text-primary">推荐助手</a>
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
