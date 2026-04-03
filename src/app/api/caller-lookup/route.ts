import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Called by Bolna for inbound caller matching
// Bolna sends: ?contact_number=+919876543210&agent_id=xxx&execution_id=xxx
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("contact_number");
  const executionId = req.nextUrl.searchParams.get("execution_id");

  if (!phone) {
    return NextResponse.json({ error: "contact_number required" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({
    where: { phone },
    include: {
      appointments: {
        where: { status: { in: ["scheduled", "confirmed"] } },
        include: { doctor: true },
        orderBy: { date: "asc" },
        take: 3,
      },
    },
  });

  if (!patient) {
    // Unknown caller - agent will ask for name and register them
    return NextResponse.json({
      patient_name: "Unknown",
      is_existing_patient: "no",
      upcoming_appointments: "none",
    });
  }

  const appointmentsSummary = patient.appointments
    .map((a) => `Appointment ID: ${a.id} — ${a.date} at ${a.startTime} with ${a.doctor.name} (${a.doctor.specialty}), status: ${a.status}`)
    .join("; ");

  // Log the inbound call
  if (executionId) {
    await prisma.callLog.create({
      data: {
        executionId,
        patientId: patient.id,
        callType: "inbound",
        status: "in-progress",
      },
    });
  }

  return NextResponse.json({
    patient_name: patient.name,
    patient_id: patient.id,
    is_existing_patient: "yes",
    upcoming_appointments: appointmentsSummary || "none",
  });
}
