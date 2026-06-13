import type { Model, Pricing, Provider } from "../schema/index";

/**
 * 模型注册表：内存中的 model/provider 索引
 * 真实使用场景：DB 是真理源，本注册表用于离线计算 / 测试 / CLI
 */
export class ModelRegistry {
  private models = new Map<string, Model>();
  private providers = new Map<string, Provider>();
  private pricingByModel = new Map<string, Pricing>();

  addProvider(p: Provider) {
    this.providers.set(p.id, p);
  }

  addModel(m: Model) {
    this.models.set(m.id, m);
  }

  setPricing(p: Pricing) {
    this.pricingByModel.set(p.model_id, p);
  }

  getModel(id: string): Model | undefined {
    return this.models.get(id) ?? this.findByAlias(id);
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id);
  }

  getPricing(modelId: string): Pricing | undefined {
    return this.pricingByModel.get(modelId);
  }

  listModels(filter?: { providerId?: string; capability?: string }): Model[] {
    let arr = Array.from(this.models.values());
    if (filter?.providerId) arr = arr.filter((m) => m.provider_id === filter.providerId);
    if (filter?.capability) arr = arr.filter((m) => m.capabilities.includes(filter.capability!));
    return arr;
  }

  listProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 通过别名 / 模糊匹配查找模型
   */
  private findByAlias(idOrAlias: string): Model | undefined {
    const lower = idOrAlias.toLowerCase();
    return Array.from(this.models.values()).find(
      (m) =>
        m.id.toLowerCase() === lower ||
        m.id.toLowerCase().includes(lower) ||
        (m.family?.toLowerCase().includes(lower) ?? false),
    );
  }
}

export function createRegistry(): ModelRegistry {
  return new ModelRegistry();
}
