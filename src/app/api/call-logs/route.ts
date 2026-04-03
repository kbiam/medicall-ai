import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const logs = await prisma.callLog.findMany({
    include: { patient: true, appointment: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}
