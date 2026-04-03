# MediCall AI - Voice-Powered Healthcare Appointment System

A full-stack healthcare appointment scheduling system powered by **Bolna Voice AI** and **Claude Sonnet 4.6**. Patients can book, cancel, and reschedule appointments through natural phone conversations — both inbound and outbound.

## Architecture

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────────────────┐
│  Patient  │<-->│  Bolna Voice AI  │<-->│  Next.js Backend             │
│  (phone)  │    │  (GPT-4o-mini)   │    │                              │
│           │    │                  │    │  POST /api/delegate          │
│           │    │  Listens, speaks │    │    |                         │
│           │    │  ONE tool:       │    │  Claude Sonnet 4.6 (Agent)   │
│           │    │    delegate      │    │    |                         │
└──────────┘     └─────────────────┘     │  bash tool -> skill commands │
                                         │    |                         │
                        ┌────────────────│  skills.ts -> Prisma -> DB   │
                        |                └──────────────────────────────┘
                        v
                 ┌──────────────┐
                 │  Dashboard   │
                 │  (Next.js)   │
                 └──────────────┘
```

### Two LLMs, one job each

- **Bolna's GPT-4o-mini**: Real-time voice layer. Listens, speaks, knows when to delegate. No DB logic.
- **Claude Sonnet 4.6**: The brain. Reads skill docs, runs commands against the DB, returns speech-ready responses.

### The Delegate Pattern

The voice agent has a single function tool called `delegate`. Whenever the patient asks for anything — booking, cancellation, slot availability — the voice agent sends the request as plain English to `POST /api/delegate`.

Our backend:
1. Loads skill definitions from `skills/*.md` files
2. Passes them to Claude as context
3. Claude uses a `bash` tool to run skill commands (e.g., `get-patient-info --phone +918160376548`)
4. We parse the command, execute the corresponding skill function against the DB
5. Feed the result back to Claude
6. Claude decides: call another skill, or return a final plain-text response
7. The voice agent reads the response aloud to the patient

## Skills

Each skill is defined as a markdown file with description, input/output spec, and example commands.

| Skill | File | What it does |
|-------|------|-------------|
| Get Patient Info | `skills/get-patient-info.md` | Looks up patient by phone, returns profile + appointments |
| Get Available Slots | `skills/get-available-slots.md` | Finds open appointment slots, filters by specialty/date |
| Book Appointment | `skills/book-appointment.md` | Books a slot for a patient (creates patient if new) |
| Cancel Appointment | `skills/cancel-appointment.md` | Cancels an appointment and frees the slot |

Skills are backed by functions in `src/lib/skills.ts` which handle the actual DB operations via Prisma.

## Call Flows

### Outbound Scheduling Call

```
Staff clicks "Schedule via Call" on dashboard
  -> POST /api/calls/outbound -> Bolna API (POST /call)
  -> Bolna calls patient, agent says welcome message
  -> Patient: "I want to book with a cardiologist"
  -> Bolna: delegate("Patient wants cardiology appointment", phone: +91...)
  -> Claude: get-patient-info -> found "Kush Bang"
  -> Claude: get-available-slots --specialty Cardiology -> 3 slots
  -> Claude: "Dr. Sharma has openings on April 4th at 9 AM, 9:30 AM, and 2 PM"
  -> Patient: "9 AM works"
  -> Bolna: delegate("Book 9 AM slot with Dr. Sharma")
  -> Claude: book-appointment --slot_id ... --patient_id ...
  -> Claude: "All booked! Dr. Sharma, April 4th at 9 AM. Arrive 10 minutes early."
  -> Call ends -> webhook -> transcript + recording saved to DB
```

### Outbound Reminder Call

```
Staff clicks "Remind" on an appointment
  -> POST /api/calls/outbound with appointment context (patient, doctor, date, time)
  -> Bolna calls patient with personalized welcome message
  -> Patient: "I can't make it, cancel it"
  -> Bolna: delegate("Cancel appointment for Kush Bang with Dr. Sharma on April 4th")
  -> Claude: get-patient-info -> finds patient + appointment
  -> Claude: cancel-appointment --appointment_id ...
  -> Claude: "Your appointment has been cancelled. Would you like to rebook?"
  -> Webhook fires -> appointment deleted, slot freed, dashboard updates
```

### Inbound Call

```
Patient calls Twilio number -> Bolna picks up with scheduling agent
  -> Patient: "I want to cancel my appointment"
  -> Bolna: delegate("Patient wants to cancel", phone: +91...)
  -> Claude: get-patient-info -> finds patient + all appointments
  -> Claude: "You have an appointment with Dr. Sharma on April 4th. Cancel that?"
  -> Patient: "Yes"
  -> Claude: cancel-appointment -> done
  -> Claude: "Cancelled. Want to rebook?"
```

## Tech Stack

- **Frontend + Backend**: Next.js 15 (App Router)
- **Database**: SQLite via Prisma ORM
- **Voice AI**: Bolna (GPT-4o-mini + ElevenLabs TTS + Deepgram Nova-3 STT)
- **Backend Agent**: Claude Sonnet 4.6 (Anthropic API)
- **Telephony**: Twilio
- **Styling**: Tailwind CSS

## Database Schema

```
Doctor (id, name, specialty)
  |
  |-- Slot (id, doctorId, date, startTime, endTime, isBooked)
  |     |
  |     |-- Appointment (id, patientId, doctorId, slotId[unique], date, startTime, endTime, status)
  |
Patient (id, name, phone[unique], email)
  |
  |-- Appointment
  |-- CallLog (id, executionId, patientId, appointmentId, callType, status, transcript, extractedData, recordingUrl)
```

## Project Structure

```
├── skills/                          # Skill definitions (markdown)
│   ├── get-patient-info.md
│   ├── get-available-slots.md
│   ├── book-appointment.md
│   └── cancel-appointment.md
├── bolna/                           # Bolna agent configs
│   ├── scheduling-agent.json
│   ├── reminder-agent.json
│   └── setup-agents.ts
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── seed.ts                      # Seed data (doctors, slots, patients)
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Sidebar + layout
│   │   │   ├── page.tsx             # Overview (stats, upcoming appointments)
│   │   │   ├── appointments/        # Appointments + doctor availability
│   │   │   ├── patients/            # Patient management + trigger calls
│   │   │   └── call-logs/           # Call history with transcripts
│   │   └── api/
│   │       ├── delegate/            # Claude agent endpoint (brain)
│   │       ├── webhook/bolna/       # Bolna post-call webhook
│   │       ├── calls/outbound/      # Trigger outbound calls
│   │       ├── skills/              # Individual skill API endpoints
│   │       │   ├── get-patient-info/
│   │       │   ├── get-available-slots/
│   │       │   ├── book-appointment/
│   │       │   └── cancel-appointment/
│   │       ├── appointments/        # CRUD for dashboard
│   │       ├── doctors/             # Doctor list + slot availability
│   │       ├── patients/            # Patient CRUD
│   │       ├── slots/               # Slot availability
│   │       ├── call-logs/           # Call log list
│   │       └── caller-lookup/       # Bolna inbound caller matching
│   ├── lib/
│   │   ├── db.ts                    # Prisma client singleton
│   │   ├── bolna.ts                 # Bolna API client
│   │   └── skills.ts                # Skill implementations (DB logic)
│   └── components/
│       └── sidebar.tsx              # Dashboard sidebar nav
└── .env                             # API keys + config
```

## Setup

### Prerequisites
- Node.js 18+
- Bolna account with Twilio connected
- Anthropic API key
- ngrok (for webhook tunneling)

### Installation

```bash
git clone <repo-url>
cd bolna-assignment2
npm install
```

### Environment Variables

```bash
cp .env.example .env
```

```env
DATABASE_URL="file:./dev.db"
BOLNA_API_KEY="your-bolna-api-key"
BOLNA_SCHEDULING_AGENT_ID="your-scheduling-agent-id"
BOLNA_REMINDER_AGENT_ID="your-reminder-agent-id"
ANTHROPIC_API_KEY="your-anthropic-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

### Create Bolna Agents

```bash
ngrok http 3000
BOLNA_API_KEY=your-key WEBHOOK_BASE_URL=https://your-ngrok-url npx tsx bolna/setup-agents.ts
```

Update `.env` with the returned agent IDs.

### Run

```bash
npm run dev
```

Open `http://localhost:3000` for the landing page, `http://localhost:3000/dashboard` for the staff dashboard.

## Enterprise Use Case

**Problem**: Healthcare clinics waste staff hours on manual phone scheduling. Patients face hold times. No-shows cost revenue.

**Solution**: Automate appointment scheduling, reminders, and cancellations with Voice AI agents that handle natural phone conversations end-to-end.

**Outcome Metric**: Reduce no-show rate and staff phone time by automating the entire scheduling workflow.

## Bolna Agent Configuration

Both agents use:
- **LLM**: GPT-4o-mini (streaming)
- **TTS**: ElevenLabs - Maya (Young Australian Female, eleven_flash_v2_5)
- **STT**: Deepgram Nova-3
- **Telephony**: Twilio
- **Function Tool**: Single `delegate` tool pointing to `POST /api/delegate`

The scheduling agent handles inbound + outbound booking calls. The reminder agent handles outbound appointment reminders with confirm/cancel/reschedule capability.
