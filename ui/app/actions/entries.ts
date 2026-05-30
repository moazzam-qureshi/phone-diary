"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/app/lib/db/client";
import { entries } from "@/app/lib/db/schema";
import { verifySession } from "@/app/lib/dal";
import { ENTRY_TYPES, CATEGORIES } from "@/app/lib/types";
import { classifyEntry } from "@/app/lib/classifier";
import { requireViewer } from "@/app/lib/identity";

// --- Capture: pure text dump. Type/category are assigned LATER by the AI. ---

const CreateSchema = z.object({
  text: z.string().trim().min(1),
  isSecret: z.boolean().optional(),
});

export type CreateEntryResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createEntry(input: {
  text: string;
  isSecret?: boolean;
}): Promise<CreateEntryResult> {
  await verifySession();

  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false, error: "SET IDENTITY FIRST" };
  }

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "EMPTY ENTRY" };
  }

  const [row] = await db
    .insert(entries)
    .values({
      text: parsed.data.text,
      author: viewer,
      isSecret: parsed.data.isSecret ?? false,
    })
    .returning({ id: entries.id });

  // Auto-classify on capture. If the AI call fails, the entry still persists
  // untagged and the timeline's "classify" button can catch it later.
  try {
    const c = await classifyEntry(parsed.data.text);
    await db
      .update(entries)
      .set({
        type: c.type,
        category: c.category,
        typeConfidence: Math.round(c.confidence * 100),
        classifiedAt: new Date(),
      })
      .where(eq(entries.id, row.id));
  } catch {
    // leave untagged; not fatal to the capture
  }

  revalidatePath("/timeline");
  return { ok: true, id: row.id };
}

// --- AI classification ---

const CLASSIFY_BATCH = 40;

export type ClassifyResult =
  | { ok: true; classified: number }
  | { ok: false; error: string };

// Classify all entries that have no type yet (and aren't user-locked).
export async function classifyUntagged(): Promise<ClassifyResult> {
  await verifySession();

  const pending = await db
    .select()
    .from(entries)
    .where(and(isNull(entries.type), eq(entries.typeLocked, false)))
    .orderBy(desc(entries.createdAt))
    .limit(CLASSIFY_BATCH);

  if (pending.length === 0) return { ok: true, classified: 0 };

  let count = 0;
  for (const e of pending) {
    try {
      const c = await classifyEntry(e.text);
      await db
        .update(entries)
        .set({
          type: c.type,
          category: c.category,
          typeConfidence: Math.round(c.confidence * 100),
          classifiedAt: new Date(),
        })
        .where(eq(entries.id, e.id));
      count++;
    } catch {
      // skip this one; leave it untagged for a later pass
    }
  }

  if (count > 0) revalidatePath("/timeline");
  return { ok: true, classified: count };
}

// --- Manual override (locks the entry so re-classify skips it) ---

const OverrideSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(ENTRY_TYPES),
  category: z.enum(CATEGORIES).nullable(),
});

export async function setEntryType(input: {
  id: string;
  type: string;
  category: string | null;
}): Promise<{ ok: boolean }> {
  await verifySession();
  const parsed = OverrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  await db
    .update(entries)
    .set({
      type: parsed.data.type,
      category: parsed.data.category,
      typeLocked: true,
      classifiedAt: new Date(),
    })
    .where(eq(entries.id, parsed.data.id));

  revalidatePath("/timeline");
  return { ok: true };
}

// --- Secret toggle (couple's mode). Only your OWN entries are lockable. ---

const SecretSchema = z.object({
  id: z.string().uuid(),
  isSecret: z.boolean(),
});

export async function setSecret(input: {
  id: string;
  isSecret: boolean;
}): Promise<{ ok: boolean }> {
  await verifySession();
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  const parsed = SecretSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const [entry] = await db
    .select({ author: entries.author })
    .from(entries)
    .where(eq(entries.id, parsed.data.id))
    .limit(1);
  // Only your OWN entries are lockable; legacy (null author) never lockable.
  if (!entry || entry.author !== viewer) return { ok: false };

  await db
    .update(entries)
    .set({
      isSecret: parsed.data.isSecret,
      // un-secreting clears gift state (it's now fully public)
      ...(parsed.data.isSecret ? {} : { giftedAt: null }),
    })
    .where(eq(entries.id, parsed.data.id));

  revalidatePath("/timeline");
  return { ok: true };
}

// --- Gift a secret to the partner (permanent reveal). Own + secret only. ---

export async function giftEntry(input: {
  id: string;
}): Promise<{ ok: boolean }> {
  await verifySession();
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  if (!z.string().uuid().safeParse(input.id).success) return { ok: false };

  const [entry] = await db
    .select({ author: entries.author, isSecret: entries.isSecret })
    .from(entries)
    .where(eq(entries.id, input.id))
    .limit(1);
  // Can only gift your OWN entry, and only if it is currently a secret.
  if (!entry || entry.author !== viewer || !entry.isSecret) return { ok: false };

  await db
    .update(entries)
    .set({ giftedAt: new Date() })
    .where(eq(entries.id, input.id));

  revalidatePath("/timeline");
  return { ok: true };
}

// --- Delete an entry ---

export async function deleteEntry(id: string): Promise<{ ok: boolean }> {
  await verifySession();
  if (!z.string().uuid().safeParse(id).success) return { ok: false };

  await db.delete(entries).where(eq(entries.id, id));

  revalidatePath("/timeline");
  return { ok: true };
}

// --- Outcome attachment (unchanged behavior) ---

const OutcomeSchema = z.object({
  id: z.string().uuid(),
  outcome: z.string().trim().min(1),
  outcomeSuccess: z.boolean().nullable(),
  outcomeNotes: z.string().trim().optional(),
});

export type AttachOutcomeResult = { ok: true } | { ok: false; error: string };

export async function attachOutcome(input: {
  id: string;
  outcome: string;
  outcomeSuccess: boolean | null;
  outcomeNotes?: string;
}): Promise<AttachOutcomeResult> {
  await verifySession();

  const parsed = OutcomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID OUTCOME" };
  }

  await db
    .update(entries)
    .set({
      outcome: parsed.data.outcome,
      outcomeSuccess: parsed.data.outcomeSuccess,
      outcomeNotes: parsed.data.outcomeNotes || null,
      outcomeAt: new Date(),
    })
    .where(eq(entries.id, parsed.data.id));

  revalidatePath("/timeline");
  return { ok: true };
}
