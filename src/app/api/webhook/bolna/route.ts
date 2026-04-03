import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Receives post-call webhook from Bolna
export async function POST(req: NextRequest) {
  const payload = await req.json();

  console.log("[Bolna Webhook] Received:", JSON.stringify(payload, null, 2));

  const {
    id: executionId,
    status,
    transcript,
    extracted_data,
    conversation_time,
    total_cost,
    telephony_data,
  } = payload;

  if (!executionId) {
    return NextResponse.json({ error: "Missing execution ID" }, { status: 400 });
  }

  const callType = telephony_data?.call_type || "outbound";
  const recordingUrl = telephony_data?.recording_url || null;
  const fromNumber = telephony_data?.from_number;
  const toNumber = telephony_data?.to_number;
  const callerPhone = callType === "inbound" ? fromNumber : toNumber;

  // Find patient by phone
  let patientId: string | null = null;
  if (callerPhone) {
    const patient = await prisma.patient.findUnique({
      where: { phone: callerPhone },
    });
    if (patient) patientId = patient.id;
  }

  // Upsert call log
  await prisma.callLog.upsert({
    where: { executionId },
    update: {
      status,
      transcript: transcript || null,
      extractedData: extracted_data ? JSON.stringify(extracted_data) : null,
      duration: conversation_time || null,
      cost: total_cost || null,
      recordingUrl,
      patientId,
    },
    create: {
      executionId,
      callType,
      status,
      transcript: transcript || null,
      extractedData: extracted_data ? JSON.stringify(extracted_data) : null,
      duration: conversation_time || null,
      cost: total_cost || null,
      recordingUrl,
      patientId,
    },
  });

  // If extracted data has appointment actions, process them
  if (extracted_data) {
    const action = extracted_data.action_taken || extracted_data.appointment_action;
    const appointmentId = extracted_data.appointment_id;

    if (action === "confirmed" && appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "confirmed" },
      }).catch(() => {}); // Ignore if appointment not found
    } else if (action === "cancelled" && appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      }).catch(() => null);
      if (appt && appt.slotId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "cancelled", slotId: null },
        });
        await prisma.slot.update({
          where: { id: appt.slotId },
          data: { isBooked: false },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
