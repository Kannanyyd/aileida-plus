import { NextResponse } from "next/server";
import { listActivePromotions } from "@/lib/db/queries";

export const revalidate = 300;

export async function GET() {
  const promotions = await listActivePromotions(100);
  return NextResponse.json({ count: promotions.length, promotions });
}
