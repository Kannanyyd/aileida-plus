/**
 * 抓取 worker 入口：长驻进程，启动后立即执行一次全量抓取，然后按 cron 定时执行
 */
import cron from "node-cron";
import { runAll } from "./pipeline.js";
import { closeBrowser } from "./fetchers/html.js";
import { config } from "./config.js";

console.log("AI 模型价格雷达 worker 启动");
console.log(`  数据库: ${config.databaseUrl.replace(/\/\/.*@/, "//***@")}`);
console.log(`  定时计划: ${process.env.WORKER_SCHEDULE ?? "每小时整点 (0 * * * *)"}`);

let isRunning = false;
let firstRun = true;

async function executeCrawl(label: string) {
  if (isRunning) {
    console.log(`[worker] 上一轮 ${label} 仍在执行，跳过`);
    return;
  }
  isRunning = true;
  const start = Date.now();
  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`[worker] ${label} 开始 ${new Date().toISOString()}`);
    console.log(`${"=".repeat(60)}`);
    await runAll();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[worker] ${label} 完成，耗时 ${elapsed}s`);
  } catch (err: any) {
    console.error(`[worker] ${label} 失败:`, err?.message ?? err);
  } finally {
    isRunning = false;
  }
}

// 启动后 5 秒执行首次抓取（等 DB 就绪）
setTimeout(() => {
  executeCrawl("首次全量抓取").then(() => {
    firstRun = false;
  });
}, 5000);

// 默认每小时跑一次全部源；用环境变量可覆盖
const schedule = process.env.WORKER_SCHEDULE ?? "0 * * * *";
cron.schedule(schedule, () => {
  executeCrawl("定时抓取");
});

// 监听进程退出
process.on("SIGINT", async () => {
  console.log("SIGINT, shutting down...");
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM, shutting down...");
  await closeBrowser();
  process.exit(0);
});

void config;
