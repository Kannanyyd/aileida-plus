import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { listProviders } from "@/lib/db/queries";

export const revalidate = 300;

export async function GET() {
  const providers = await listProviders();
  return NextResponse.json({ count: providers.length, providers });
}
