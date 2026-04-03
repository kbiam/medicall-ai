import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET - list appointments (dashboard)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const patientId = req.nextUrl.searchParams.get("patient_id");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: { patient: true, doctor: true, slot: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(appointments);
}

// POST - book appointment (called by Bolna function tool or dashboard)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slot_id, patient_phone, patient_name, patient_id, notes } = body;

  if (!slot_id) {
    return NextResponse.json({ error: "slot_id is required" }, { status: 400 });
  }

  // Verify slot is available
  const slot = await prisma.slot.findUnique({
    where: { id: slot_id },
    include: { doctor: true },
  });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.isBooked) {
    return NextResponse.json({
      error: "This slot is already booked. Please choose another slot.",
      success: false,
    }, { status: 409 });
  }

  // Find or create patient
  let patientRecord;
  if (patient_id) {
    patientRecord = await prisma.patient.findUnique({ where: { id: patient_id } });
  } else if (patient_phone) {
    patientRecord = await prisma.patient.findUnique({ where: { phone: patient_phone } });
    if (!patientRecord && patient_name) {
      patientRecord = await prisma.patient.create({
        data: { name: patient_name, phone: patient_phone },
      });
    }
  }

  if (!patientRecord) {
    return NextResponse.json({
      error: "Patient not found. Please provide patient_phone and patient_name.",
      success: false,
    }, { status: 400 });
  }

  // Book the appointment
  const [appointment] = await prisma.$transaction([
    prisma.appointment.create({
      data: {
        patientId: patientRecord.id,
        doctorId: slot.doctorId,
        slotId: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        notes: notes || null,
      },
      include: { doctor: true, patient: true },
    }),
    prisma.slot.update({
      where: { id: slot.id },
      data: { isBooked: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: `Appointment booked successfully with ${appointment.doctor.name} on ${appointment.date} at ${appointment.startTime}`,
    appointment_id: appointment.id,
    doctor_name: appointment.doctor.name,
    date: appointment.date,
    time: appointment.startTime,
  });
}

// PATCH - update appointment status
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { appointment_id, status, notes } = body;

  console.log("[PATCH /api/appointments] Received:", JSON.stringify(body));

  if (!appointment_id) {
    return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  }

  // Find the appointment first
  const existing = await prisma.appointment.findUnique({
    where: { id: appointment_id },
  });

  if (!existing) {
    console.log("[PATCH /api/appointments] Appointment not found:", appointment_id);
    return NextResponse.json({
      error: `Appointment with ID ${appointment_id} not found`,
      success: false,
    }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (notes) data.notes = notes;

  const appointment = await prisma.appointment.update({
    where: { id: appointment_id },
    data,
    include: { patient: true, doctor: true },
  });

  // If cancelled, delete the appointment and free the slot
  if (status === "cancelled") {
    await prisma.appointment.delete({ where: { id: appointment_id } });
    await prisma.slot.update({
      where: { id: appointment.slotId },
      data: { isBooked: false },
    });
  }

  console.log("[PATCH /api/appointments] Success:", appointment_id, "→", status);

  return NextResponse.json({
    success: true,
    message: `Appointment ${status || "updated"} successfully`,
    appointment,
  });
}
