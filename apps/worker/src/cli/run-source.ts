import { runLiteLLM, runOpenRouter, runLlmPrices, runGenaiPrices, runAllCn, runOfficialModels, auditLatestModels, runPriorityCnyPricing } from "../pipeline.js";
import { closeBrowser } from "../fetchers/html.js";

const map: Record<string, () => Promise<void>> = {
  litellm: runLiteLLM,
  openrouter: runOpenRouter,
  "llm-prices": runLlmPrices,
  "genai-prices": runGenaiPrices,
  cn: runAllCn,
  "cn-cny-pricing": runPriorityCnyPricing,
  "official-models": async () => { await runOfficialModels(); },
  "latest-models": async () => { await auditLatestModels(); },
};

const target = process.argv[2] ?? "all";
const fn = target === "all" ? async () => {
  await runLiteLLM();
  await runOpenRouter();
  await runLlmPrices();
  await runGenaiPrices();
  await runAllCn();
} : map[target];

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
