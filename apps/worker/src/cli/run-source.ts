import { runLiteLLM, runOpenRouter, runLlmPrices, runGenaiPrices, runAllCn, runOfficialModels, auditLatestModels, runPriorityCnyPricing, runVendorAnnouncements, runAll } from "../pipeline.js";
import { closeBrowser } from "../fetchers/html.js";

const map: Record<string, () => Promise<void>> = {
  litellm: runLiteLLM,
  openrouter: runOpenRouter,
  "llm-prices": runLlmPrices,
  "genai-prices": runGenaiPrices,
  cn: runAllCn,
  "cn-cny-pricing": runPriorityCnyPricing,
  news: runVendorAnnouncements,
  "vendor-announcements": runVendorAnnouncements,
  "official-models": async () => { await runOfficialModels(); },
  "latest-models": async () => { await auditLatestModels(); },
};

const target = process.argv[2] ?? "all";
const fn = target === "all" ? runAll : map[target];

if (!fn) {
  console.error(`Unknown source: ${target}. Available: ${Object.keys(map).join(", ")}`);
  process.exit(1);
}

fn()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeBrowser());
