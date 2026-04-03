"use client";

import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneOutgoing, RefreshCw } from "lucide-react";

interface CallLog {
  id: string;
  executionId: string | null;
  callType: string;
  status: string;
  transcript: string | null;
  extractedData: string | null;
  summary: string | null;
  duration: number | null;
  cost: number | null;
  recordingUrl: string | null;
  createdAt: string;
  patient: { name: string; phone: string } | null;
  appointment: { date: string; startTime: string; doctor: { name: string } } | null;
}

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const res = await fetch("/api/call-logs");
    setLogs(await res.json());
    setLoading(false);
  }

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    "in-progress": "bg-blue-100 text-blue-700",
    queued: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    "no-answer": "bg-orange-100 text-orange-700",
  };

  const callTypeIcons: Record<string, typeof PhoneIncoming> = {
    inbound: PhoneIncoming,
    outbound_reminder: PhoneOutgoing,
    outbound_scheduling: PhoneOutgoing,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
          <p className="text-gray-500 mt-1">Voice AI call history and transcripts</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => {
          const Icon = callTypeIcons[log.callType] || PhoneOutgoing;
          const isExpanded = expandedId === log.id;

          return (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${log.callType === "inbound" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {log.patient?.name || "Unknown Caller"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {log.callType.replace("_", " ")} - {log.patient?.phone || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {log.duration && (
                    <span className="text-sm text-gray-500">{Math.round(log.duration)}s</span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[log.status] || "bg-gray-100 text-gray-700"}`}>
                    {log.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-4 border-t border-gray-100 pt-4 space-y-3">
                  {log.executionId && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Execution ID</p>
                      <p className="text-sm text-gray-700 font-mono">{log.executionId}</p>
                    </div>
                  )}
                  {log.transcript && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Transcript</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                        {log.transcript}
                      </p>
                    </div>
                  )}
                  {log.extractedData && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Extracted Data</p>
                      <pre className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(JSON.parse(log.extractedData), null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.recordingUrl && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Recording</p>
                      <audio controls src={log.recordingUrl} className="w-full" />
                    </div>
                  )}
                  {!log.transcript && !log.extractedData && (
                    <p className="text-sm text-gray-500">No additional details available yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="text-center py-12 text-gray-500">No call logs yet</div>
        )}
      </div>
    </div>
  );
}
