import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makeOutboundCall } from "@/lib/bolna";

// Trigger outbound call from dashboard
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { patient_id, call_type, appointment_id } = body;

  if (!patient_id || !call_type) {
    return NextResponse.json(
      { error: "patient_id and call_type are required" },
      { status: 400 }
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patient_id },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  let agentId: string;
  let userData: Record<string, string> = {
    patient_name: patient.name,
    patient_phone: patient.phone,
  };

  if (call_type === "reminder" && appointment_id) {
    agentId = process.env.BOLNA_REMINDER_AGENT_ID!;
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointment_id },
      include: { doctor: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    userData = {
      ...userData,
      appointment_id: appointment.id,
      appointment_date: appointment.date,
      appointment_time: appointment.startTime,
      doctor_name: appointment.doctor.name,
      doctor_specialty: appointment.doctor.specialty,
    };
  } else {
    agentId = process.env.BOLNA_SCHEDULING_AGENT_ID!;
  }

  if (!agentId) {
    return NextResponse.json(
      { error: "Bolna agent ID not configured" },
      { status: 500 }
    );
  }

  let result;
  try {
    result = await makeOutboundCall({
      agentId,
      recipientPhone: patient.phone,
      userData,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Log the call
  await prisma.callLog.create({
    data: {
      executionId: result.execution_id || null,
      patientId: patient.id,
      appointmentId: appointment_id || null,
      callType: call_type === "reminder" ? "outbound_reminder" : "outbound_scheduling",
      status: "queued",
    },
  });

  return NextResponse.json({
    success: true,
    message: `Call queued to ${patient.name} (${patient.phone})`,
    execution_id: result.execution_id,
  });
}
