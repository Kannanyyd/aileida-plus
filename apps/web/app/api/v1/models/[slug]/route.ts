import { NextResponse } from "next/server";
import { getModelBySlug } from "@/lib/db/queries";

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const m = await getModelBySlug(decodeURIComponent(slug));
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(m);
}
