import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import {
  getPatientInfo,
  getAvailableSlots,
  bookAppointment,
  cancelAppointment,
} from "@/lib/skills";

const anthropic = new Anthropic();

// Load skill definitions from markdown files
function loadSkills(): string {
  const skillsDir = path.join(process.cwd(), "skills");
  const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith(".md"));
  return files
    .map((f) => fs.readFileSync(path.join(skillsDir, f), "utf-8"))
    .join("\n---\n");
}

const SKILLS_DOCS = loadSkills();

const SYSTEM_PROMPT = `You are a healthcare scheduling backend agent for MediCall Healthcare.

Available doctors:
- Dr. Priya Patel (General Medicine)
- Dr. Rajesh Sharma (Cardiology)
- Dr. Anita Gupta (Dermatology)

You have these skills available. Each skill shows its API contract with example curl commands. To execute a skill, use the bash tool with a command like the examples — but instead of curl, write it as a simple command string that maps to the skill.

${SKILLS_DOCS}

---

To execute a skill, use the bash tool with this format:
  get-patient-info --phone +919876543210
  get-available-slots --specialty Cardiology --date 2026-04-04
  book-appointment --slot_id abc123 --patient_id xyz456
  book-appointment --slot_id abc123 --patient_phone +919876543210 --patient_name "John Doe"
  cancel-appointment --appointment_id abc123

Instructions:
1. If caller_phone is provided, ALWAYS look up the patient first.
2. Execute skills as needed, read the results, decide next steps.
3. When you have enough info, respond with plain text (no tool calls).
4. Format for speech — "April 4th" not "2026-04-04", "9:30 AM" not "09:30".
5. Never include internal IDs in your final response.
6. Max 3-4 slot options when listing availability.
7. Keep final response concise — read aloud on a phone call.`;

function parseSkillCommand(command: string): { skill: string; params: Record<string, string> } | null {
  const parts = command.trim().split(/\s+/);
  const skill = parts[0];
  const params: Record<string, string> = {};

  let i = 1;
  while (i < parts.length) {
    if (parts[i].startsWith("--")) {
      const key = parts[i].slice(2);
      // Collect value — might be quoted
      let value = "";
      i++;
      if (i < parts.length && parts[i].startsWith('"')) {
        // Quoted value
        value = parts[i].slice(1);
        i++;
        while (i < parts.length && !value.endsWith('"')) {
          value += " " + parts[i];
          i++;
        }
        value = value.replace(/"$/, "");
      } else if (i < parts.length && !parts[i].startsWith("--")) {
        value = parts[i];
        i++;
      }
      params[key] = value;
    } else {
      i++;
    }
  }

  return skill ? { skill, params } : null;
}

async function executeSkill(skill: string, params: Record<string, string>): Promise<string> {
  switch (skill) {
    case "get-patient-info":
      return JSON.stringify(await getPatientInfo(params.phone), null, 2);
    case "get-available-slots":
      return JSON.stringify(await getAvailableSlots({ specialty: params.specialty, date: params.date }), null, 2);
    case "book-appointment":
      return JSON.stringify(await bookAppointment(params as { slot_id: string; patient_id?: string; patient_name?: string; patient_phone?: string }), null, 2);
    case "cancel-appointment":
      return JSON.stringify(await cancelAppointment(params.appointment_id), null, 2);
    default:
      return JSON.stringify({ error: `Unknown skill: ${skill}` });
  }
}

const bashTool: Anthropic.Tool = {
  name: "bash",
  description: "Execute a skill command. Format: skill-name --param value",
  input_schema: {
    type: "object" as const,
    properties: {
      command: { type: "string", description: "The skill command to execute" },
    },
    required: ["command"],
  },
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_request, caller_phone, call_type } = body;

  console.log("[Delegate] Request:", JSON.stringify(body));

  const context = `Caller phone: ${caller_phone || "unknown"}\nCall type: ${call_type || "unknown"}`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${context}\n\nRequest: ${user_request}` },
  ];

  // Agent loop
  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [bashTool],
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const input = toolUse.input as { command: string };
        console.log(`[Delegate] Command: ${input.command}`);

        const parsed = parseSkillCommand(input.command);
        let output: string;
        if (parsed) {
          output = await executeSkill(parsed.skill, parsed.params);
        } else {
          output = JSON.stringify({ error: "Could not parse command" });
        }
        console.log(`[Delegate] Output: ${output.slice(0, 300)}`);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: output,
        });
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Final text response
    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "Sorry, I could not process that request.";

    console.log("[Delegate] Final response:", text);
    return NextResponse.json({ response: text });
  }

  return NextResponse.json({
    response: "Sorry, I was unable to process that request. Please try again.",
  });
}
