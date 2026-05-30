import "server-only";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env } from "@/app/lib/env";
import {
  ENTRY_TYPES,
  CATEGORIES,
  TYPE_MEANING,
  type Category,
  type EntryType,
} from "@/app/lib/types";

// LangChain v1 structured-output classifier. Talks to OpenRouter via ChatOpenAI
// with a custom baseURL. Verified against latest LangChain JS v1 docs.

// Zod schema the model is forced to fill (.withStructuredOutput).
const ClassificationSchema = z.object({
  type: z
    .enum(ENTRY_TYPES)
    .describe("The single best-fitting journey type for this entry."),
  category: z
    .enum(CATEGORIES)
    .describe("The life area this entry belongs to."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the type assignment, 0 to 1."),
});

export type Classification = z.infer<typeof ClassificationSchema>;

const TYPE_GUIDE = ENTRY_TYPES.map((t) => `- ${t}: ${TYPE_MEANING[t]}`).join("\n");

const SYSTEM = `You classify short personal journal entries from a self-logging device.

Assign exactly one TYPE from this "journey" vocabulary:
${TYPE_GUIDE}

Assign exactly one CATEGORY from: ${CATEGORIES.join(", ")}.

Guidance:
- TURN = a decision, choice, bet, or change of direction.
- PULSE = a description of the person's feeling, mood, energy, or mental state.
- MIRROR = a realization or observation the person makes about themselves / a pattern.
- FORGE = something the person built, shipped, executed, or pushed through.
- TRACE = anything that doesn't clearly fit the above; the safe catch-all.
Pick TRACE when genuinely unsure rather than forcing a wrong type.
Return confidence reflecting how clear the type is.`;

function model() {
  return new ChatOpenAI({
    model: env.OPENROUTER_MODEL,
    apiKey: env.OPENROUTER_API_KEY,
    configuration: { baseURL: env.OPENROUTER_BASE_URL },
    temperature: 0,
  }).withStructuredOutput(ClassificationSchema, { name: "classification" });
}

// Classify a single entry's text into { type, category, confidence }.
export async function classifyEntry(text: string): Promise<Classification> {
  const llm = model();
  const result = await llm.invoke([
    { role: "system", content: SYSTEM },
    { role: "user", content: `ENTRY:\n${text}` },
  ]);
  return result as Classification;
}

export function isEntryType(v: unknown): v is EntryType {
  return typeof v === "string" && (ENTRY_TYPES as readonly string[]).includes(v);
}
export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}
