/**
 * 国内厂商 source registry —— 每家厂商的官方价格页 + 模型列表 + 公告 + 优惠
 *
 * 字段：
 * - id:          数据源 id
 * - displayName: 显示名
 * - providerSlug: 在 DB 中对应的 provider slug
 * - region:      'cn' | 'global'
 * - targets[]:   至少 4 类 URL：pricing_list / model_list / announcement / promotion
 */
export interface CnProviderTarget {
  kind: "pricing_list" | "model_list" | "announcement" | "promotion";
  url: string;
  fetcher: "playwright" | "fetch" | "api";
  parserHint?: string;
}

export interface CnProvider {
  id: string;
  displayName: string;
  providerSlug: string;
  region: "cn" | "global";
  homepage: string;
  targets: CnProviderTarget[];
}

export const CN_PROVIDERS: CnProvider[] = [
  {
    id: "cn-aliyun-bailian",
    displayName: "阿里云百炼",
    providerSlug: "aliyun-bailian",
    region: "cn",
    homepage: "https://bailian.console.aliyun.com/",
    targets: [
      { kind: "pricing_list", url: "https://help.aliyun.com/zh/model-studio/model-pricing", fetcher: "playwright" },
      { kind: "model_list", url: "https://bailian.console.aliyun.com/", fetcher: "playwright" },
      { kind: "announcement", url: "https://help.aliyun.com/zh/model-studio/", fetcher: "playwright" },
      { kind: "promotion", url: "https://www.aliyun.com/product/bailian", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-volcengine-ark",
    displayName: "火山方舟 / 豆包",
    providerSlug: "volcengine",
    region: "cn",
    homepage: "https://www.volcengine.com/product/ark",
    targets: [
      { kind: "pricing_list", url: "https://www.volcengine.com/docs/82379", fetcher: "playwright" },
      { kind: "model_list", url: "https://www.volcengine.com/product/ark", fetcher: "playwright" },
      { kind: "announcement", url: "https://www.volcengine.com/docs/82379", fetcher: "playwright" },
      { kind: "promotion", url: "https://www.volcengine.com/activity", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-tencent-hunyuan",
    displayName: "腾讯混元",
    providerSlug: "tencent-hunyuan",
    region: "cn",
    homepage: "https://cloud.tencent.com/product/hunyuan",
    targets: [
      { kind: "pricing_list", url: "https://cloud.tencent.com/document/product/1729", fetcher: "playwright" },
      { kind: "model_list", url: "https://cloud.tencent.com/product/hunyuan", fetcher: "playwright" },
      { kind: "announcement", url: "https://cloud.tencent.com/announce", fetcher: "playwright" },
      { kind: "promotion", url: "https://cloud.tencent.com/act", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-baidu-qianfan",
    displayName: "百度千帆",
    providerSlug: "baidu-qianfan",
    region: "cn",
    homepage: "https://qianfan.cloud.baidu.com/",
    targets: [
      { kind: "pricing_list", url: "https://cloud.baidu.com/doc/qianfan/s/hlrk4akp7", fetcher: "playwright" },
      { kind: "model_list", url: "https://qianfan.cloud.baidu.com/modelSquare", fetcher: "playwright" },
      { kind: "announcement", url: "https://cloud.baidu.com/support/newsroom", fetcher: "playwright" },
      { kind: "promotion", url: "https://cloud.baidu.com/campaign", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-zhipu-glm",
    displayName: "智谱 GLM",
    providerSlug: "zhipu",
    region: "cn",
    homepage: "https://www.zhipuai.cn/",
    targets: [
      { kind: "pricing_list", url: "https://open.bigmodel.cn/pricing", fetcher: "playwright" },
      { kind: "model_list", url: "https://open.bigmodel.cn/modelcenter", fetcher: "playwright" },
      { kind: "announcement", url: "https://open.bigmodel.cn/dev/howuse/announcement", fetcher: "playwright" },
      { kind: "promotion", url: "https://www.zhipuai.cn/activity", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-moonshot-kimi",
    displayName: "月之暗面 Kimi",
    providerSlug: "moonshot",
    region: "cn",
    homepage: "https://www.moonshot.cn/",
    targets: [
      { kind: "pricing_list", url: "https://platform.moonshot.cn/docs/pricing/limits", fetcher: "playwright" },
      { kind: "model_list", url: "https://platform.moonshot.cn/docs/intro", fetcher: "playwright" },
      { kind: "announcement", url: "https://platform.moonshot.cn/docs/announcement", fetcher: "playwright" },
      { kind: "promotion", url: "https://platform.moonshot.cn/console/promotion", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-deepseek",
    displayName: "DeepSeek",
    providerSlug: "deepseek",
    region: "cn",
    homepage: "https://www.deepseek.com/",
    targets: [
      { kind: "pricing_list", url: "https://api-docs.deepseek.com/quick_start/pricing", fetcher: "fetch" },
      { kind: "model_list", url: "https://api-docs.deepseek.com/", fetcher: "fetch" },
      { kind: "announcement", url: "https://api-docs.deepseek.com/news/", fetcher: "fetch" },
      { kind: "promotion", url: "https://platform.deepseek.com/activities", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-MiniMax",
    displayName: "MiniMax",
    providerSlug: "MiniMax",
    region: "cn",
    homepage: "https://api.MiniMax.chat/",
    targets: [
      { kind: "pricing_list", url: "https://platform.MiniMax.io/docs/pricing/overview", fetcher: "playwright" },
      { kind: "model_list", url: "https://platform.MiniMax.io/docs/guides/models", fetcher: "playwright" },
      { kind: "announcement", url: "https://platform.MiniMax.io/notice", fetcher: "playwright" },
      { kind: "promotion", url: "https://platform.MiniMax.io/activity", fetcher: "playwright" },
    ],
  },
  {
    id: "cn-siliconflow",
    displayName: "硅基流动",
    providerSlug: "siliconflow",
    region: "cn",
    homepage: "https://siliconflow.cn/",
    targets: [
      { kind: "pricing_list", url: "https://siliconflow.cn/pricing", fetcher: "playwright" },
      { kind: "model_list", url: "https://siliconflow.cn/models", fetcher: "playwright" },
      { kind: "announcement", url: "https://siliconflow.cn/news", fetcher: "playwright" },
      { kind: "promotion", url: "https://siliconflow.cn/promotion", fetcher: "playwright" },
    ],
  },
];

export function getProviderById(id: string): CnProvider | undefined {
  return CN_PROVIDERS.find((p) => p.id === id);
}
