import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { listModels } from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";

export const revalidate = 600;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "1"), 1);
  const offset = parseInt(url.searchParams.get("offset") ?? String((page - 1) * limit));
  const diversityMode = url.searchParams.get("diversity_mode") !== "false";
  const defaultMaxProvider = limit <= 10 ? "2" : limit <= 20 ? "3" : limit <= 50 ? "8" : "14";
  const defaultMaxFamily = limit <= 10 ? "1" : limit <= 20 ? "2" : limit <= 50 ? "3" : "5";
  const maxPerProvider = parseInt(url.searchParams.get("max_per_provider") ?? (diversityMode ? defaultMaxProvider : "999"));
  const maxPerFamily = parseInt(url.searchParams.get("max_per_family") ?? (diversityMode ? defaultMaxFamily : "999"));
  // 默认隐藏旧模型、废弃模型和无法判断新旧的模型。
  const hideLegacy = url.searchParams.get("hide_legacy") !== "false" && url.searchParams.get("show_legacy") !== "true";
  const hideDeprecated = url.searchParams.get("hide_deprecated") !== "false" && url.searchParams.get("show_deprecated") !== "true";
  const hideUnknown = url.searchParams.get("hide_unknown") !== "false" && url.searchParams.get("show_unknown") !== "true";
  const filterRegion = url.searchParams.get("region");
  const filterChannel = url.searchParams.get("channel");
  const filterProvider = url.searchParams.get("provider");
  const filterFamily = url.searchParams.get("family");

  let models = await listModels({ limit: 2000, region: filterRegion ?? undefined, channel: filterChannel ?? undefined });
  
  // 额外筛选
  if (filterProvider) models = models.filter((m) => m.provider_slug === filterProvider);
  if (filterFamily) models = models.filter((m) => (m.family ?? "") === filterFamily);

  const result = rank(models, type, {
    limit, offset, maxPerProvider, maxPerFamily, diversityMode, hideLegacy, hideDeprecated, hideUnknown,
  });

  // 可用的榜单类型列表
  const availablePresets = Object.entries(RANKING_PRESETS).map(([key, p]) => ({
    key, label: p.label,
  }));

  return NextResponse.json({
    ...result,
    available_presets: availablePresets,
    active_filters: { diversityMode, maxPerProvider, maxPerFamily, hideLegacy, hideDeprecated, hideUnknown, region: filterRegion, channel: filterChannel, provider: filterProvider, family: filterFamily },
  });
}
