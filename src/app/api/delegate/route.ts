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

const skillsDir = path.join(process.cwd(), "skills");

// Load just name + first line description for system prompt
function loadSkillIndex(): string {
  const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith(".md"));
  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(skillsDir, f), "utf-8");
      const name = f.replace(".md", "");
      // First non-empty line after the # heading is the description
      const lines = content.split("\n").filter((l) => l.trim());
      const description = lines[1] || "";
      return `- **${name}**: ${description}`;
    })
    .join("\n");
}

const SKILL_INDEX = loadSkillIndex();

const SYSTEM_PROMPT = `You are a healthcare scheduling backend agent for MediCall Healthcare.

Available doctors:
- Dr. Priya Patel (General Medicine)
- Dr. Rajesh Sharma (Cardiology)
- Dr. Anita Gupta (Dermatology)

You have these skills available:

${SKILL_INDEX}

You have two tools:
1. **read_skill** — Read the full documentation for a skill before using it. Always read a skill's doc first if you haven't already in this conversation.
2. **bash** — Execute a skill command after reading its docs.

Workflow:
1. If caller_phone is provided, read the get-patient-info skill, then execute it.
2. Read the relevant skill doc for what the patient needs.
3. Execute the skill using the bash tool.
4. Repeat as needed. When you have enough info, respond with plain text.

Rules:
- Always read a skill doc before executing it for the first time.
- Format for speech — "April 4th" not "2026-04-04", "9:30 AM" not "09:30".
- Never include internal IDs in your final response.
- Max 3-4 slot options when listing availability.
- Keep final response concise — it will be read aloud on a phone call.`;

const tools: Anthropic.Tool[] = [
  {
    name: "read_skill",
    description:
      "Read the full documentation for a skill. Call this before using a skill for the first time to understand its inputs, outputs, command format, and how to respond.",
    input_schema: {
      type: "object" as const,
      properties: {
        skill_name: {
          type: "string",
          description:
            "The skill name to read: get-patient-info, get-available-slots, book-appointment, or cancel-appointment",
        },
      },
      required: ["skill_name"],
    },
  },
  {
    name: "bash",
    description: "Execute a skill command. Format: skill-name --param value",
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "The skill command to execute",
        },
      },
      required: ["command"],
    },
  },
];

function readSkillDoc(skillName: string): string {
  const filePath = path.join(skillsDir, `${skillName}.md`);
  if (!fs.existsSync(filePath)) {
    return `Skill "${skillName}" not found. Available: get-patient-info, get-available-slots, book-appointment, cancel-appointment`;
  }
  return fs.readFileSync(filePath, "utf-8");
}

function parseSkillCommand(
  command: string
): { skill: string; params: Record<string, string> } | null {
  const parts = command.trim().split(/\s+/);
  const skill = parts[0];
  const params: Record<string, string> = {};

  let i = 1;
  while (i < parts.length) {
    if (parts[i].startsWith("--")) {
      const key = parts[i].slice(2);
      let value = "";
      i++;
      if (i < parts.length && parts[i].startsWith('"')) {
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

async function executeSkill(
  skill: string,
  params: Record<string, string>
): Promise<string> {
  switch (skill) {
    case "get-patient-info":
      return JSON.stringify(await getPatientInfo(params.phone), null, 2);
    case "get-available-slots":
      return JSON.stringify(
        await getAvailableSlots({
          specialty: params.specialty,
          date: params.date,
        }),
        null,
        2
      );
    case "book-appointment":
      return JSON.stringify(
        await bookAppointment(
          params as {
            slot_id: string;
            patient_id?: string;
            patient_name?: string;
            patient_phone?: string;
          }
        ),
        null,
        2
      );
    case "cancel-appointment":
      return JSON.stringify(
        await cancelAppointment(params.appointment_id),
        null,
        2
      );
    default:
      return JSON.stringify({ error: `Unknown skill: ${skill}` });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_request, caller_phone, call_type } = body;

  console.log("[Delegate] Request:", JSON.stringify(body));

  const context = `Caller phone: ${caller_phone || "unknown"}\nCall type: ${call_type || "unknown"}`;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${context}\n\nRequest: ${user_request}` },
  ];

  // Agent loop
  for (let i = 0; i < 10; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        let output: string;

        if (toolUse.name === "read_skill") {
          const input = toolUse.input as { skill_name: string };
          console.log(`[Delegate] Read skill: ${input.skill_name}`);
          output = readSkillDoc(input.skill_name);
        } else {
          const input = toolUse.input as { command: string };
          console.log(`[Delegate] Command: ${input.command}`);
          const parsed = parseSkillCommand(input.command);
          if (parsed) {
            output = await executeSkill(parsed.skill, parsed.params);
          } else {
            output = JSON.stringify({ error: "Could not parse command" });
          }
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
    const text =
      textBlock && "text" in textBlock
        ? textBlock.text
        : "Sorry, I could not process that request.";

    console.log("[Delegate] Final response:", text);
    return NextResponse.json({ response: text });
  }

  return NextResponse.json({
    response: "Sorry, I was unable to process that request. Please try again.",
  });
}
