/**
 * Setup script to create Bolna agents via API.
 *
 * Usage:
 *   BOLNA_API_KEY=your-key WEBHOOK_BASE_URL=https://your-ngrok-url npx tsx bolna/setup-agents.ts
 */

const BOLNA_API_URL = "https://api.bolna.ai";
const API_KEY = process.env.BOLNA_API_KEY;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL;

if (!API_KEY) {
  console.error("Error: BOLNA_API_KEY environment variable is required");
  process.exit(1);
}

if (!WEBHOOK_BASE_URL) {
  console.error("Error: WEBHOOK_BASE_URL environment variable is required (your ngrok URL)");
  process.exit(1);
}

async function createAgent(config: Record<string, unknown>) {
  const res = await fetch(`${BOLNA_API_URL}/v2/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create agent: ${res.status} - ${error}`);
  }

  return res.json();
}

async function main() {
  console.log("Creating Bolna agents...\n");
  console.log(`Webhook base URL: ${WEBHOOK_BASE_URL}\n`);

  // Scheduling Agent
  console.log("1. Creating Scheduling Agent...");
  const schedulingResult = await createAgent({
    agent_config: {
      agent_name: "MediCall Scheduling Agent",
      agent_welcome_message:
        "Hello! Thank you for calling MediCall Healthcare. I'm Medi, your AI scheduling assistant. How can I help you today? I can help you book a new appointment, reschedule, or cancel an existing one.",
      agent_type: "other",
      webhook_url: `${WEBHOOK_BASE_URL}/api/webhook/bolna`,
      tasks: [
        {
          task_type: "conversation",
          toolchain: {
            execution: "parallel",
            pipelines: [["transcriber", "llm", "synthesizer"]],
          },
          tools_config: {
            llm_agent: {
              agent_flow_type: "streaming",
              provider: "openai",
              agent_type: "simple_llm_agent",
              llm_config: {
                model: "gpt-4o-mini",
                temperature: 0.3,
                max_tokens: 200,
              },
            },
            synthesizer: {
              provider: "elevenlabs",
              provider_config: {
                voice: "Sarah",
                voice_id: "EXAVITQu4vr4xnSDxMaL",
                model: "eleven_turbo_v2_5",
              },
              stream: true,
              buffer_size: 100,
              audio_format: "wav",
            },
            transcriber: {
              provider: "deepgram",
              language: "en",
              provider_config: {
                model: "nova-2",
                language: "en",
              },
            },
            input: { provider: "twilio", format: "wav" },
            output: { provider: "twilio", format: "wav" },
          },
          task_config: {
            hangup_after_silence: 15,
          },
        },
        {
          task_type: "extraction",
          toolchain: {
            execution: "parallel",
            pipelines: [["llm"]],
          },
          tools_config: {
            llm_agent: {
              agent_flow_type: "streaming",
              agent_type: "simple_llm_agent",
              provider: "openai",
              llm_config: {
                model: "gpt-4o-mini",
                temperature: 0.1,
              },
            },
          },
          task_config: {
            extraction_details: {
              patient_name: { description: "The name of the patient", type: "string" },
              action_taken: {
                description: "What action was taken",
                type: "string",
                choices: ["booked", "rescheduled", "cancelled", "enquiry_only", "none"],
              },
              appointment_date: { description: "The appointment date discussed", type: "string" },
              doctor_name: { description: "The doctor name", type: "string" },
            },
          },
        },
      ],
    },
    agent_prompts: {
      task_1: {
        system_prompt: `## Personality
You are Medi, a friendly and professional healthcare scheduling assistant at MediCall Healthcare clinic. You speak clearly, are patient, and always confirm details before taking action.

## Context
You help patients book, reschedule, or cancel appointments with our doctors. You have access to real-time slot availability and can book appointments during the call.

## Instructions
1. Greet the patient warmly
2. Ask what they need help with (book new, reschedule, cancel)
3. For NEW BOOKING:
   - Ask which specialty they need (General Medicine, Cardiology, or Dermatology)
   - Use the check_available_slots function to find available times
   - Present 3-4 options to the patient
   - Once they choose, use the book_appointment function
   - Confirm the booking details
4. For RESCHEDULING:
   - Ask about their existing appointment
   - Find new available slots and book
5. For CANCELLATION:
   - Confirm which appointment to cancel
   - Process the cancellation
6. Always end by asking if there's anything else they need

## Guardrails
- Never provide medical advice
- Always confirm date, time, and doctor before booking
- Be concise — this is a phone call, not a chat
- If you can't help with something, offer to transfer to the front desk`,
      },
    },
  });

  console.log(`   Created! Agent ID: ${schedulingResult.agent_id}`);
  console.log(`   Status: ${schedulingResult.status}\n`);

  // Reminder Agent
  console.log("2. Creating Reminder Agent...");
  const reminderResult = await createAgent({
    agent_config: {
      agent_name: "MediCall Reminder Agent",
      agent_welcome_message:
        "Hello {patient_name}! This is Medi from MediCall Healthcare. I'm calling to remind you about your upcoming appointment with {doctor_name} on {appointment_date} at {appointment_time}. Can you confirm you'll be able to make it?",
      agent_type: "other",
      webhook_url: `${WEBHOOK_BASE_URL}/api/webhook/bolna`,
      tasks: [
        {
          task_type: "conversation",
          toolchain: {
            execution: "parallel",
            pipelines: [["transcriber", "llm", "synthesizer"]],
          },
          tools_config: {
            llm_agent: {
              agent_flow_type: "streaming",
              provider: "openai",
              agent_type: "simple_llm_agent",
              llm_config: {
                model: "gpt-4o-mini",
                temperature: 0.3,
                max_tokens: 150,
              },
            },
            synthesizer: {
              provider: "elevenlabs",
              provider_config: {
                voice: "Sarah",
                voice_id: "EXAVITQu4vr4xnSDxMaL",
                model: "eleven_turbo_v2_5",
              },
              stream: true,
              buffer_size: 100,
              audio_format: "wav",
            },
            transcriber: {
              provider: "deepgram",
              language: "en",
              provider_config: {
                model: "nova-2",
                language: "en",
              },
            },
            input: { provider: "twilio", format: "wav" },
            output: { provider: "twilio", format: "wav" },
          },
          task_config: {
            hangup_after_silence: 10,
          },
        },
        {
          task_type: "extraction",
          toolchain: {
            execution: "parallel",
            pipelines: [["llm"]],
          },
          tools_config: {
            llm_agent: {
              agent_flow_type: "streaming",
              agent_type: "simple_llm_agent",
              provider: "openai",
              llm_config: {
                model: "gpt-4o-mini",
                temperature: 0.1,
              },
            },
          },
          task_config: {
            extraction_details: {
              appointment_action: {
                description: "What the patient decided about their appointment",
                type: "string",
                choices: ["confirmed", "cancelled", "rescheduled", "no_response"],
              },
              appointment_id: { description: "The appointment ID", type: "string" },
              patient_sentiment: {
                description: "Patient sentiment",
                type: "string",
                choices: ["positive", "neutral", "negative"],
              },
            },
          },
        },
      ],
    },
    agent_prompts: {
      task_1: {
        system_prompt: `## Personality
You are Medi, a friendly appointment reminder assistant at MediCall Healthcare. You are warm, concise, and respectful of the patient's time.

## Context
You are making an outbound reminder call about an upcoming appointment.

Appointment details:
- Patient: {patient_name}
- Doctor: {doctor_name} ({doctor_specialty})
- Date: {appointment_date}
- Time: {appointment_time}
- Appointment ID: {appointment_id}

## Instructions
1. Introduce yourself and state the purpose — reminding about their appointment
2. Share the appointment details (doctor, date, time)
3. Ask if they can confirm attendance
4. Based on response:
   - CONFIRMING: Thank them, remind to arrive 10 minutes early
   - CANCELLING: Express understanding, note the cancellation
   - RESCHEDULING: Acknowledge and let them know the clinic will call back to reschedule
5. Thank them and end the call

## Guardrails
- Keep the call under 2 minutes
- Don't provide medical advice
- Be understanding about cancellations
- Always be polite and professional`,
      },
    },
  });

  console.log(`   Created! Agent ID: ${reminderResult.agent_id}`);
  console.log(`   Status: ${reminderResult.status}\n`);

  console.log("========================================");
  console.log("Setup complete! Add these to your .env:");
  console.log("========================================");
  console.log(`BOLNA_SCHEDULING_AGENT_ID="${schedulingResult.agent_id}"`);
  console.log(`BOLNA_REMINDER_AGENT_ID="${reminderResult.agent_id}"`);
  console.log("\nNOTE: Add function tools in the Bolna dashboard for the scheduling agent:");
  console.log("- check_available_slots: GET", `${WEBHOOK_BASE_URL}/api/slots`);
  console.log("- book_appointment: POST", `${WEBHOOK_BASE_URL}/api/appointments`);
  console.log("- cancel_appointment: PATCH", `${WEBHOOK_BASE_URL}/api/appointments`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
