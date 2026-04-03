import { NextRequest, NextResponse } from "next/server";
import { cancelAppointment } from "@/lib/skills";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.appointment_id) return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  return NextResponse.json(await cancelAppointment(body.appointment_id));
}
