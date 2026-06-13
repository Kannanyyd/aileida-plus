import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getModelBySlug, getModelPricingList } from "@/lib/db/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  
  // 支持 /pricing 后缀
  const cleanSlug = decoded.endsWith("/pricing") ? decoded.slice(0, -"/pricing".length) : decoded;
  
  const m = await getModelBySlug(cleanSlug);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  
  const pricingList = await getModelPricingList(m.model_id);
  return NextResponse.json({ model: m, pricing: pricingList });
}
