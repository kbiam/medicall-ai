import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/skills";

export async function GET(req: NextRequest) {
  const specialty = req.nextUrl.searchParams.get("specialty") || undefined;
  const date = req.nextUrl.searchParams.get("date") || undefined;
  const slots = await getAvailableSlots({ specialty, date });
  return NextResponse.json({ slots });
}
