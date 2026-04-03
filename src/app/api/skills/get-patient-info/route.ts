import { NextRequest, NextResponse } from "next/server";
import { getPatientInfo } from "@/lib/skills";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
  return NextResponse.json(await getPatientInfo(phone));
}
