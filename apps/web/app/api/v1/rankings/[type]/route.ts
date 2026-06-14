import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";

export const dynamic = "force-dynamic";
export const revalidate = 600;

function boolParam(url: URL, name: string, fallback: boolean) {
  const value = url.searchParams.get(name);
  if (value == null) return fallback;
  return value !== "false" && value !== "0";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50"), 1), 200);
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "1"), 1);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? String((page - 1) * limit)), 0);
  const diversityMode = boolParam(url, "diversity_mode", true);
  const defaultMaxProvider = limit <= 10 ? "2" : limit <= 20 ? "3" : limit <= 50 ? "8" : "14";
  const defaultMaxFamily = limit <= 10 ? "1" : limit <= 20 ? "2" : limit <= 50 ? "3" : "5";
  const maxPerProvider = parseInt(url.searchParams.get("max_per_provider") ?? (diversityMode ? defaultMaxProvider : "999"));
  const maxPerFamily = parseInt(url.searchParams.get("max_per_family") ?? (diversityMode ? defaultMaxFamily : "999"));
  const hideLegacy = boolParam(url, "hide_legacy", true) && url.searchParams.get("show_legacy") !== "true";
  const hideDeprecated = boolParam(url, "hide_deprecated", true) && url.searchParams.get("show_deprecated") !== "true";
  const hideUnknown = boolParam(url, "hide_unknown", true) && url.searchParams.get("show_unknown") !== "true";
  const hideStale = boolParam(url, "hide_stale", true);
  const hideSuperseded = boolParam(url, "hide_superseded", true);
  const maxSourceAgeHours = Math.min(Math.max(parseInt(url.searchParams.get("max_source_age_hours") ?? "24"), 1), 720);
  const filterRegion = url.searchParams.get("region");
  const filterChannel = url.searchParams.get("channel");
  const filterProvider = url.searchParams.get("provider");
  const filterFamily = url.searchParams.get("family");

  let rows = await listModels({
    limit: 2000,
    providerSlug: filterProvider ?? undefined,
    region: filterRegion ?? undefined,
    channel: filterChannel ?? undefined,
  });

  if (filterFamily) {
    rows = rows.filter((m) => m.model_family === filterFamily || m.family === filterFamily);
  }

  const result = rank(rows, type, {
    limit,
    offset,
    maxPerProvider,
    maxPerFamily,
    diversityMode,
    hideLegacy,
    hideDeprecated,
    hideUnknown,
    hideStale,
    hideSuperseded,
    maxSourceAgeHours,
  });

  const availablePresets = Object.entries(RANKING_PRESETS).map(([key, p]) => ({
    key,
    label: p.label,
  }));

  return NextResponse.json({
    ...result,
    available_presets: availablePresets,
    active_filters: {
      diversityMode,
      maxPerProvider,
      maxPerFamily,
      hideLegacy,
      hideDeprecated,
      hideUnknown,
      hideStale,
      hideSuperseded,
      maxSourceAgeHours,
      region: filterRegion,
      channel: filterChannel,
      provider: filterProvider,
      family: filterFamily,
    },
  });
}
