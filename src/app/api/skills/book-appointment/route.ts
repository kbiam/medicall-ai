import { NextRequest, NextResponse } from "next/server";
import { bookAppointment } from "@/lib/skills";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.slot_id) return NextResponse.json({ error: "slot_id required" }, { status: 400 });
  return NextResponse.json(await bookAppointment(body));
}
