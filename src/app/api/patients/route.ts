import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const patients = await prisma.patient.findMany({
    include: {
      _count: { select: { appointments: true, callLogs: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone required" }, { status: 400 });
  }

  const existing = await prisma.patient.findUnique({ where: { phone } });
  if (existing) {
    return NextResponse.json({ error: "Patient with this phone already exists" }, { status: 409 });
  }

  const patient = await prisma.patient.create({
    data: { name, phone, email: email || null },
  });

  return NextResponse.json(patient, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Delete related records first
  await prisma.callLog.deleteMany({ where: { patientId: id } });
  await prisma.appointment.deleteMany({ where: { patientId: id } });
  await prisma.patient.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
