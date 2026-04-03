"use client";

import { useEffect, useState } from "react";
import { Calendar, Phone, Plus, X, Clock, User } from "lucide-react";

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  patient: { id: string; name: string; phone: string };
  doctor: { id: string; name: string; specialty: string };
}

interface Slot {
  slot_id: string;
  doctor_name: string;
  specialty: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface DoctorSlotInfo {
  id: string;
  name: string;
  specialty: string;
  slots: { id: string; date: string; startTime: string; endTime: string }[];
  _count: { slots: number; appointments: number };
}

const specialtyColors: Record<string, string> = {
  "General Medicine": "bg-blue-50 text-blue-700 border-blue-200",
  Cardiology: "bg-red-50 text-red-700 border-red-200",
  Dermatology: "bg-purple-50 text-purple-700 border-purple-200",
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookModal, setShowBookModal] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [callLoading, setCallLoading] = useState<string | null>(null);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [apptRes, docRes] = await Promise.all([
      fetch("/api/appointments"),
      fetch("/api/doctors/slots"),
    ]);
    setAppointments(await apptRes.json());
    setDoctorSlots(await docRes.json());
    setLoading(false);
  }

  async function openBookModal() {
    setShowBookModal(true);
    const [slotsRes, patientsRes] = await Promise.all([
      fetch(`/api/slots${filterDate ? `?date=${filterDate}` : ""}`),
      fetch("/api/patients"),
    ]);
    const slotsData = await slotsRes.json();
    setSlots(slotsData.available_slots);
    setPatients(await patientsRes.json());
  }

  async function bookAppointment() {
    if (!selectedSlot || !selectedPatient) return;
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot_id: selectedSlot, patient_id: selectedPatient }),
    });
    if (res.ok) {
      setShowBookModal(false);
      setSelectedSlot("");
      setSelectedPatient("");
      fetchAll();
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: id, status }),
    });
    fetchAll();
  }

  async function sendReminder(appointment: Appointment) {
    setCallLoading(appointment.id);
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: appointment.patient.id,
          call_type: "reminder",
          appointment_id: appointment.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Reminder call queued for ${appointment.patient.name}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to trigger call");
    }
    setCallLoading(null);
  }

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-gray-100 text-gray-700",
    rescheduled: "bg-yellow-100 text-yellow-700",
  };

  // Group slots by date for a doctor
  function groupSlotsByDate(slots: DoctorSlotInfo["slots"]) {
    const grouped: Record<string, typeof slots> = {};
    for (const s of slots) {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    }
    return grouped;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage appointments and view doctor availability</p>
        </div>
        <button
          onClick={openBookModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Book Appointment
        </button>
      </div>

      {/* Doctor Availability Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Doctor Availability</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {doctorSlots.map((doc) => {
            const isExpanded = expandedDoctor === doc.id;
            const grouped = groupSlotsByDate(doc.slots.slice(0, 30));
            const dates = Object.keys(grouped).slice(0, 5);

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  specialtyColors[doc.specialty]?.split(" ")[2] || "border-gray-200"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${specialtyColors[doc.specialty] || "bg-gray-100 text-gray-700"}`}>
                        {doc.specialty}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">{doc._count.slots}</span>
                      </div>
                      <p className="text-xs text-gray-500">open slots</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {doc._count.appointments} booked
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandedDoctor(isExpanded ? null : doc.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {isExpanded ? "Hide slots" : "View available slots"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 max-h-64 overflow-auto">
                    {dates.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No available slots</p>
                    ) : (
                      dates.map((date) => (
                        <div key={date} className="mb-3 last:mb-0">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">
                            {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {grouped[date].map((slot) => (
                              <span
                                key={slot.id}
                                className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                              >
                                {slot.startTime}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Appointments</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Doctor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date & Time</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appointments.map((appt) => (
              <tr key={appt.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{appt.patient.name}</p>
                  <p className="text-sm text-gray-500">{appt.patient.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900">{appt.doctor.name}</p>
                  <p className="text-sm text-gray-500">{appt.doctor.specialty}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-900">{appt.date}</p>
                  <p className="text-sm text-gray-500">{appt.startTime} - {appt.endTime}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[appt.status] || "bg-gray-100 text-gray-700"}`}>
                    {appt.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {appt.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => sendReminder(appt)}
                          disabled={callLoading === appt.id}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {callLoading === appt.id ? "Calling..." : "Remind"}
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, "confirmed")}
                          className="text-sm text-green-600 hover:text-green-800"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => updateStatus(appt.id, "cancelled")}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {appt.status === "confirmed" && (
                      <button
                        onClick={() => updateStatus(appt.id, "completed")}
                        className="text-sm text-green-600 hover:text-green-800"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No appointments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Book Appointment</h2>
              <button onClick={() => setShowBookModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <select
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a patient</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={async (e) => {
                    setFilterDate(e.target.value);
                    const res = await fetch(`/api/slots?date=${e.target.value}`);
                    const data = await res.json();
                    setSlots(data.available_slots);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Slot</label>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {slots.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No available slots</p>
                  ) : (
                    slots.map((slot) => (
                      <label
                        key={slot.slot_id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSlot === slot.slot_id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="slot"
                            value={slot.slot_id}
                            checked={selectedSlot === slot.slot_id}
                            onChange={(e) => setSelectedSlot(e.target.value)}
                            className="text-blue-600"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{slot.doctor_name}</p>
                            <p className="text-xs text-gray-500">{slot.specialty}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">{slot.date}</p>
                          <p className="text-xs text-gray-500">{slot.start_time} - {slot.end_time}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowBookModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={bookAppointment}
                disabled={!selectedSlot || !selectedPatient}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
