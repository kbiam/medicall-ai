import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Called by Bolna function tool during conversation + by dashboard
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const doctorId = req.nextUrl.searchParams.get("doctor_id");
  const specialty = req.nextUrl.searchParams.get("specialty");

  const today = new Date().toISOString().split("T")[0];

  const where: Record<string, unknown> = {
    isBooked: false,
    date: { gte: today },
  };

  if (date) where.date = date;
  if (doctorId) where.doctorId = doctorId;
  if (specialty) where.doctor = { specialty: { contains: specialty } };

  const slots = await prisma.slot.findMany({
    where,
    include: { doctor: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 20,
  });

  // Filter out past time slots for today
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const filtered = slots.filter((s) => {
    if (s.date !== today) return true;
    const [h, m] = s.startTime.split(":").map(Number);
    return h > currentHour || (h === currentHour && m > currentMinute);
  });

  // Format for Bolna agent consumption
  const formatted = filtered.map((s) => ({
    slot_id: s.id,
    doctor_name: s.doctor.name,
    specialty: s.doctor.specialty,
    date: s.date,
    start_time: s.startTime,
    end_time: s.endTime,
  }));

  return NextResponse.json({
    available_slots: formatted,
    message: formatted.length > 0
      ? `Found ${formatted.length} available slots`
      : "No available slots found for the given criteria",
  });
}
