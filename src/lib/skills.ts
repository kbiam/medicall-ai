import { prisma } from "@/lib/db";

const today = () => new Date().toISOString().split("T")[0];

export async function getPatientInfo(phone: string) {
  const patient = await prisma.patient.findUnique({
    where: { phone },
    include: {
      appointments: {
        where: { status: { in: ["scheduled", "confirmed"] }, date: { gte: today() } },
        include: { doctor: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!patient) return { found: false };

  return {
    found: true,
    patient_id: patient.id,
    name: patient.name,
    phone: patient.phone,
    appointments: patient.appointments.map((a) => ({
      appointment_id: a.id,
      date: a.date,
      time: a.startTime,
      doctor: a.doctor.name,
      specialty: a.doctor.specialty,
      status: a.status,
    })),
  };
}

export async function getAvailableSlots(params: { specialty?: string; date?: string }) {
  const now = new Date();
  const todayStr = today();

  const where: Record<string, unknown> = {
    isBooked: false,
    date: { gte: todayStr },
  };
  if (params.date) where.date = params.date;
  if (params.specialty) where.doctor = { specialty: { contains: params.specialty } };

  const slots = await prisma.slot.findMany({
    where,
    include: { doctor: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 15,
  });

  const filtered = slots.filter((s) => {
    if (s.date !== todayStr) return true;
    const [h, m] = s.startTime.split(":").map(Number);
    return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
  });

  return filtered.map((s) => ({
    slot_id: s.id,
    doctor: s.doctor.name,
    specialty: s.doctor.specialty,
    date: s.date,
    time: `${s.startTime}-${s.endTime}`,
  }));
}

export async function bookAppointment(params: {
  slot_id: string;
  patient_id?: string;
  patient_name?: string;
  patient_phone?: string;
}) {
  const slot = await prisma.slot.findUnique({
    where: { id: params.slot_id },
    include: { doctor: true },
  });
  if (!slot) return { success: false, error: "Slot not found" };
  if (slot.isBooked) return { success: false, error: "Slot already booked" };

  let patientId = params.patient_id;
  if (!patientId && params.patient_phone) {
    let patient = await prisma.patient.findUnique({ where: { phone: params.patient_phone } });
    if (!patient && params.patient_name) {
      patient = await prisma.patient.create({
        data: { name: params.patient_name, phone: params.patient_phone },
      });
    }
    if (patient) patientId = patient.id;
  }
  if (!patientId) return { success: false, error: "Need patient_id or patient_phone + patient_name" };

  const [appointment] = await prisma.$transaction([
    prisma.appointment.create({
      data: {
        patientId,
        doctorId: slot.doctorId,
        slotId: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
      include: { doctor: true },
    }),
    prisma.slot.update({ where: { id: slot.id }, data: { isBooked: true } }),
  ]);

  return {
    success: true,
    appointment_id: appointment.id,
    doctor: appointment.doctor.name,
    date: appointment.date,
    time: appointment.startTime,
  };
}

export async function cancelAppointment(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) return { success: false, error: "Appointment not found" };

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled", slotId: null },
    }),
    prisma.slot.update({ where: { id: appt.slotId! }, data: { isBooked: false } }),
  ]);

  return { success: true, message: "Appointment cancelled" };
}
