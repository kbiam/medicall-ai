import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  const doctors = await prisma.doctor.findMany({
    include: {
      slots: {
        where: { isBooked: false, date: { gte: today } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      },
      _count: {
        select: {
          slots: { where: { isBooked: false, date: { gte: today } } },
          appointments: { where: { status: { in: ["scheduled", "confirmed"] } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Filter out past time slots for today
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const filtered = doctors.map((doc) => ({
    ...doc,
    slots: doc.slots.filter((s) => {
      if (s.date !== today) return true;
      const [h, m] = s.startTime.split(":").map(Number);
      return h > currentHour || (h === currentHour && m > currentMinute);
    }),
  }));

  // Update counts to reflect filtered slots
  for (const doc of filtered) {
    doc._count.slots = doc.slots.length;
  }

  return NextResponse.json(filtered);
}
