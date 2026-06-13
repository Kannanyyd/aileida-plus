import "dotenv/config";

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgres://radar:radar@localhost:5432/ai_price_radar",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",

  sources: {
    litellm: process.env.LITELLM_PRICES_URL ?? "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
    openrouter: process.env.OPENROUTER_MODELS_URL ?? "https://openrouter.ai/api/v1/models",
    llmPricesCurrent: process.env.LLM_PRICES_CURRENT_URL ?? "https://www.llm-prices.com/current-v1.json",
    llmPricesHistorical: process.env.LLM_PRICES_HISTORICAL_URL ?? "https://www.llm-prices.com/historical-v1.json",
    genaiPrices: process.env.GENAI_PRICES_URL ?? "https://raw.githubusercontent.com/pydantic/genai-prices/main/prices/data_slim.json",
    genaiPricesSlim: process.env.GENAI_PRICES_SLIM_URL ?? "https://raw.githubusercontent.com/pydantic/genai-prices/main/prices/data.json",
  },

  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? "",
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  },

  fx: {
    usdCny: Number(process.env.USD_CNY_RATE ?? "7.18"),
  },

  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  requestTimeoutMs: 180000,
};
