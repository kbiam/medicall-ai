import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Skip if already seeded
  const existingDoctors = await prisma.doctor.count();
  if (existingDoctors > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const drPatel = await prisma.doctor.create({
    data: { name: "Dr. Priya Patel", specialty: "General Medicine" },
  });
  const drSharma = await prisma.doctor.create({
    data: { name: "Dr. Rajesh Sharma", specialty: "Cardiology" },
  });
  const drGupta = await prisma.doctor.create({
    data: { name: "Dr. Anita Gupta", specialty: "Dermatology" },
  });

  const today = new Date();
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = date.toISOString().split("T")[0];

    for (const doctor of [drPatel, drSharma, drGupta]) {
      const hours = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
      for (const startTime of hours) {
        const [h, m] = startTime.split(":").map(Number);
        const endMinutes = m + 30;
        const endTime = `${String(h + Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

        await prisma.slot.create({
          data: { doctorId: doctor.id, date: dateStr, startTime, endTime },
        });
      }
    }
  }

  await prisma.patient.create({
    data: { name: "Amit Kumar", phone: "+919876543210", email: "amit@example.com" },
  });
  await prisma.patient.create({
    data: { name: "Sneha Reddy", phone: "+919876543211", email: "sneha@example.com" },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
