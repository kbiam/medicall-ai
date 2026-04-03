import Link from "next/link";
import { Activity, Phone, Calendar, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Activity className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">MediCall AI</span>
        </div>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Open Dashboard
        </Link>
      </nav>

      <main className="max-w-6xl mx-auto px-8 pt-24 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Voice AI for Healthcare
            <br />
            <span className="text-blue-600">Appointments</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Automate patient scheduling, reminders, and follow-ups with Bolna-powered
            voice agents. Reduce no-shows. Save staff hours.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="p-3 bg-blue-50 rounded-lg w-fit mb-4">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Inbound Scheduling</h3>
            <p className="text-gray-600">
              Patients call in and the AI agent checks available slots, books appointments, and handles rescheduling automatically.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="p-3 bg-green-50 rounded-lg w-fit mb-4">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Outbound Reminders</h3>
            <p className="text-gray-600">
              AI agent calls patients to remind them of upcoming appointments, confirm attendance, or handle cancellations.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="p-3 bg-purple-50 rounded-lg w-fit mb-4">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Dashboard</h3>
            <p className="text-gray-600">
              Staff manage everything from one dashboard — appointments, patients, call logs with transcripts and recordings.
            </p>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Patient Interaction", desc: "Patient calls in or staff triggers an outbound call from the dashboard" },
              { step: "2", title: "Voice AI Agent", desc: "Bolna voice agent handles the conversation — checks slots, books, or confirms" },
              { step: "3", title: "Backend Processing", desc: "Function tools call our API in real-time to check availability and book slots" },
              { step: "4", title: "Dashboard Update", desc: "Webhook updates the dashboard with call results, transcripts, and status changes" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-10 w-10 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  {item.step}
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-sm text-gray-500">
        Built with Next.js + Bolna Voice AI | Healthcare Appointment System
      </footer>
    </div>
  );
}
