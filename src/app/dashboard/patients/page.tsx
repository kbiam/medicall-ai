"use client";

import { useEffect, useState } from "react";
import { Plus, Phone, X, Trash2 } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  _count: { appointments: number; callLogs: number };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [callLoading, setCallLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    const res = await fetch("/api/patients");
    setPatients(await res.json());
    setLoading(false);
  }

  async function addPatient() {
    if (!form.name || !form.phone) return;
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAddModal(false);
      setForm({ name: "", phone: "", email: "" });
      fetchPatients();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  }

  async function triggerSchedulingCall(patient: Patient) {
    setCallLoading(patient.id);
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.id, call_type: "scheduling" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Scheduling call queued for ${patient.name}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert("Failed to trigger call");
    }
    setCallLoading(null);
  }

  async function deletePatient(patient: Patient) {
    if (!confirm(`Delete ${patient.name}? This will also delete their appointments and call logs.`)) return;
    await fetch(`/api/patients?id=${patient.id}`, { method: "DELETE" });
    fetchPatients();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 mt-1">Manage patient records and trigger calls</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Patient
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <div key={patient.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-700 font-semibold text-sm">
                    {patient.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-500">{patient.phone}</p>
                </div>
              </div>
            </div>
            {patient.email && (
              <p className="text-sm text-gray-500 mt-2">{patient.email}</p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>{patient._count.appointments} appointments</span>
              <span>{patient._count.callLogs} calls</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => triggerSchedulingCall(patient)}
                disabled={callLoading === patient.id}
                className="flex items-center gap-1.5 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
              >
                <Phone className="h-3.5 w-3.5" />
                {callLoading === patient.id ? "Calling..." : "Schedule via Call"}
              </button>
              <button
                onClick={() => deletePatient(patient)}
                className="flex items-center gap-1.5 text-sm bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {patients.length === 0 && (
        <div className="text-center py-12 text-gray-500">No patients yet</div>
      )}

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Patient</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Patient name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (E.164)</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="+919876543210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="patient@example.com"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={addPatient}
                disabled={!form.name || !form.phone}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
