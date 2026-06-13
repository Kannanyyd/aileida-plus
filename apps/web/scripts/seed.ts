/**
 * 种子数据：仅做最小验证
 * 真正数据由 worker 抓取
 */
import { config } from "../lib/env.js";
import { db } from "../lib/db/client.js";
import { providers, fxRates } from "../lib/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding providers & fx_rates...");

  // FX
  const fxRows = await db.select().from(fxRates).limit(1);
  if (fxRows.length === 0) {
    await db.insert(fxRates).values({
      base: "USD",
      quote: "CNY",
      rate: String(config.fx.usdCny),
      source: "static",
    });
    console.log("✓ inserted USD/CNY rate");
  }

  // 一些国内厂商种子
  const seeds = [
    { slug: "aliyun-bailian", name_zh: "阿里云百炼", name_en: "Aliyun Bailian", region: "cn" as const, homepage: "https://bailian.console.aliyun.com" },
    { slug: "volcengine", name_zh: "火山方舟 / 豆包", name_en: "Volcengine Ark", region: "cn" as const, homepage: "https://www.volcengine.com/product/ark" },
    { slug: "tencent-hunyuan", name_zh: "腾讯混元", name_en: "Tencent Hunyuan", region: "cn" as const, homepage: "https://cloud.tencent.com/product/hunyuan" },
    { slug: "baidu-qianfan", name_zh: "百度千帆", name_en: "Baidu Qianfan", region: "cn" as const, homepage: "https://qianfan.cloud.baidu.com" },
    { slug: "zhipu", name_zh: "智谱 GLM", name_en: "Zhipu AI", region: "cn" as const, homepage: "https://www.zhipuai.cn" },
    { slug: "moonshot", name_zh: "月之暗面 Kimi", name_en: "Moonshot AI", region: "cn" as const, homepage: "https://www.moonshot.cn" },
    { slug: "deepseek", name_zh: "DeepSeek", name_en: "DeepSeek", region: "cn" as const, homepage: "https://www.deepseek.com" },
    { slug: "MiniMax", name_zh: "MiniMax", name_en: "MiniMax", region: "cn" as const, homepage: "https://api.MiniMax.chat" },
    { slug: "siliconflow", name_zh: "硅基流动 SiliconFlow", name_en: "SiliconFlow", region: "cn" as const, homepage: "https://siliconflow.cn" },
    { slug: "openai", name_zh: "OpenAI", name_en: "OpenAI", region: "global" as const, homepage: "https://openai.com" },
    { slug: "anthropic", name_zh: "Anthropic", name_en: "Anthropic", region: "global" as const, homepage: "https://anthropic.com" },
    { slug: "google", name_zh: "Google DeepMind", name_en: "Google", region: "global" as const, homepage: "https://deepmind.google" },
  ];

  for (const s of seeds) {
    const exists = await db.select().from(providers).where(eq(providers.slug, s.slug)).limit(1);
    if (exists.length === 0) {
      await db.insert(providers).values(s);
      console.log(`✓ inserted provider: ${s.slug}`);
    }
  }

  console.log("Seeding done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
