const BOLNA_API_URL = "https://api.bolna.ai";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.BOLNA_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function makeOutboundCall(params: {
  agentId: string;
  recipientPhone: string;
  userData?: Record<string, string>;
}) {
  const res = await fetch(`${BOLNA_API_URL}/call`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      agent_id: params.agentId,
      recipient_phone_number: params.recipientPhone,
      user_data: params.userData || {},
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Bolna API error: ${res.status} - ${error}`);
  }

  return res.json();
}

export async function getExecution(executionId: string) {
  const res = await fetch(`${BOLNA_API_URL}/executions/${executionId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Bolna API error: ${res.status}`);
  }

  return res.json();
}
