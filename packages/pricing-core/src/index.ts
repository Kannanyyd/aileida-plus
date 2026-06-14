export * from "./schema/index";
export * from "./calculator/index";
export * from "./registry/index";
export * from "./official-current/index";

import { estimateCost, rankByCost } from "./calculator/index";
import type { Pricing } from "./schema/index";
import type { Usage } from "./calculator/index";

/**
 * 顶层 calculator 入口
 */
export const calculator = {
  estimate(modelSlug: string, pricing: Pricing, usage: Usage) {
    return estimateCost(pricing, usage);
  },
  rank(pricings: Pricing[], usage: Usage) {
    return rankByCost(pricings, usage);
  },
};
