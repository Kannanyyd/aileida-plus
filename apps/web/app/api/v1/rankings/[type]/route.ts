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
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const diversityMode = url.searchParams.get("diversity_mode") !== "false";
  const maxPerProvider = parseInt(url.searchParams.get("max_per_provider") ?? (diversityMode ? "5" : "999"));
  const maxPerFamily = parseInt(url.searchParams.get("max_per_family") ?? (diversityMode ? "3" : "999"));
  const hideLegacy = url.searchParams.get("hide_legacy") === "true";
  const hideDeprecated = url.searchParams.get("hide_deprecated") === "true";
  const filterRegion = url.searchParams.get("region");
  const filterProvider = url.searchParams.get("provider");
  const filterFamily = url.searchParams.get("family");

  let models = await listModels({ limit: 1000 });
  
  // 额外筛选
  if (filterRegion) models = models.filter((m) => m.provider_region === filterRegion);
  if (filterProvider) models = models.filter((m) => m.provider_slug === filterProvider);
  if (filterFamily) models = models.filter((m) => (m.family ?? "") === filterFamily);

  const result = rank(models, type, {
    limit, offset, maxPerProvider, maxPerFamily, diversityMode, hideLegacy, hideDeprecated,
  });

  // 可用的榜单类型列表
  const availablePresets = Object.entries(RANKING_PRESETS).map(([key, p]) => ({
    key, label: p.label,
  }));

  return NextResponse.json({
    ...result,
    available_presets: availablePresets,
    active_filters: { diversityMode, maxPerProvider, maxPerFamily, hideLegacy, hideDeprecated, region: filterRegion, provider: filterProvider, family: filterFamily },
  });
}
