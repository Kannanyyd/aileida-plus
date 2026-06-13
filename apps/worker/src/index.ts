/**
 * 抓取 worker 入口：可作为长驻进程（cron 调度），
 * 也可作为一次性 CLI 调用（见 cli/run-all.ts / run-source.ts）
 */
import cron from "node-cron";
import { runAll } from "./pipeline.js";
import { closeBrowser } from "./fetchers/html.js";
import { config } from "./config.js";

console.log("AI 模型价格雷达 worker 启动");

// 默认每小时跑一次全部源；用环境变量可覆盖
const schedule = process.env.WORKER_SCHEDULE ?? "0 * * * *";
cron.schedule(schedule, () => {
  console.log(`[cron] ${new Date().toISOString()} run all`);
  runAll().catch((err) => console.error("[cron] failed:", err));
});

process.on("SIGINT", async () => {
  console.log("SIGINT, shutting down...");
  await closeBrowser();
  process.exit(0);
});

void config;
