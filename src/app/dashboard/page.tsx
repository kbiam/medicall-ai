import { prisma } from "@/lib/db";
import { Calendar, Users, Phone, CheckCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];

  const [
    totalAppointments,
    todayAppointments,
    totalPatients,
    recentCalls,
    upcomingAppointments,
  ] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({ where: { date: today } }),
    prisma.patient.count(),
    prisma.callLog.count(),
    prisma.appointment.findMany({
      where: { date: { gte: today }, status: { in: ["scheduled", "confirmed"] } },
      include: { patient: true, doctor: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Total Appointments", value: totalAppointments, icon: Calendar, color: "blue" },
    { label: "Today's Appointments", value: todayAppointments, icon: CheckCircle, color: "green" },
    { label: "Total Patients", value: totalPatients, icon: Users, color: "purple" },
    { label: "Call Logs", value: recentCalls, icon: Phone, color: "orange" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Healthcare appointment management overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${colorMap[stat.color]}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          <Link
            href="/dashboard/appointments"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {upcomingAppointments.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No upcoming appointments</p>
          ) : (
            upcomingAppointments.map((appt) => (
              <div key={appt.id} className="p-4 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {appt.patient.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{appt.patient.name}</p>
                    <p className="text-sm text-gray-500">
                      {appt.doctor.name} - {appt.doctor.specialty}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{appt.date}</p>
                  <p className="text-sm text-gray-500">{appt.startTime} - {appt.endTime}</p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    appt.status === "confirmed"
                      ? "bg-green-100 text-green-700"
                      : appt.status === "scheduled"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {appt.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
