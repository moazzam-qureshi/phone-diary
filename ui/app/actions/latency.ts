"use server";

import { revalidatePath } from "next/cache";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/app/lib/db/client";
import { entries } from "@/app/lib/db/schema";
import { verifySession } from "@/app/lib/dal";
import { completeChat } from "@/app/lib/openrouter";
import { LATENCY_SYSTEM_PROMPT } from "@/app/lib/prompt";

const CANDIDATE_LIMIT = 120;

export type AnalyzeLatencyResult =
  | { ok: true; linked: number }
  | { ok: false; error: string };

// Manual "analyze & save" pass: ask the LLM to pair unlinked decision entries
// (SHIFT/PUSH) to later executions, then persist the linkage + computed latency.
export async function analyzeLatency(): Promise<AnalyzeLatencyResult> {
  await verifySession();

  const recent = await db
    .select()
    .from(entries)
    .orderBy(desc(entries.createdAt))
    .limit(CANDIDATE_LIMIT);

  const byId = new Map(recent.map((e) => [e.id, e]));

  const decisions = recent.filter(
    (e) => e.type === "TURN" && e.executesEntryId == null,
  );
  if (decisions.length === 0) {
    return { ok: true, linked: 0 };
  }

  const fmt = (e: (typeof recent)[number]) =>
    `${e.id} | ${e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt} | ${e.type} | ${e.text.replace(/\s+/g, " ").slice(0, 200)}`;

  const userMsg = [
    "DECISION entries (unlinked):",
    ...decisions.map(fmt),
    "",
    "CANDIDATE execution entries (all recent):",
    ...recent.map(fmt),
  ].join("\n");

  let raw: string;
  try {
    raw = await completeChat([
      { role: "system", content: LATENCY_SYSTEM_PROMPT },
      { role: "user", content: userMsg },
    ]);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }

  // Tolerate fenced or padded JSON.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { ok: true, linked: 0 };

  let pairs: Array<{
    decisionId: string;
    executionId: string;
    confidence: number;
  }> = [];
  try {
    pairs = JSON.parse(match[0]).pairs ?? [];
  } catch {
    return { ok: false, error: "AI returned malformed JSON" };
  }

  let linked = 0;
  for (const p of pairs) {
    if (p.confidence < 0.6) continue;
    const decision = byId.get(p.decisionId);
    const execution = byId.get(p.executionId);
    if (!decision || !execution || decision.id === execution.id) continue;

    const dT = new Date(decision.createdAt).getTime();
    const xT = execution.outcomeAt
      ? new Date(execution.outcomeAt).getTime()
      : new Date(execution.createdAt).getTime();
    if (xT <= dT) continue; // execution must come after the decision

    await db
      .update(entries)
      .set({
        executesEntryId: decision.id,
        decisionLatencyMs: xT - dT,
      })
      .where(eq(entries.id, execution.id));
    linked++;
  }

  if (linked > 0) revalidatePath("/timeline");
  return { ok: true, linked };
}

// Clears all persisted linkages (handy when re-running analysis).
export async function resetLatency(): Promise<{ ok: true }> {
  await verifySession();
  await db
    .update(entries)
    .set({ executesEntryId: null, decisionLatencyMs: null })
    .where(isNotNull(entries.executesEntryId));
  revalidatePath("/timeline");
  return { ok: true };
}
