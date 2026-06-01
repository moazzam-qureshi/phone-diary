"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/app/lib/db/client";
import { reactions, entries } from "@/app/lib/db/schema";
import { requireViewer } from "@/app/lib/identity";
import { entryVisibility } from "@/app/lib/visibility";
import { isReactionEmoji, MAX_NOTE_LEN } from "@/app/lib/reactions-shared";

const SetSchema = z.object({
  entryId: z.string().uuid(),
  emoji: z.string().refine(isReactionEmoji, "INVALID EMOJI"),
  note: z.string().trim().max(MAX_NOTE_LEN).optional(),
});

// React to a partner's visible entry (emoji + optional note). Upserts on
// (entry_id, author); a change resets seen_at so it re-announces.
export async function setReaction(input: {
  entryId: string;
  emoji: string;
  note?: string;
}): Promise<{ ok: boolean }> {
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  const parsed = SetSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const [entry] = await db
    .select()
    .from(entries)
    .where(eq(entries.id, parsed.data.entryId))
    .limit(1);
  if (!entry) return { ok: false };

  // Must be a partner entry the viewer can fully see (never own, never locked).
  if (entry.author === viewer) return { ok: false };
  if (entryVisibility(entry, viewer).kind !== "full") return { ok: false };

  await db
    .insert(reactions)
    .values({
      entryId: parsed.data.entryId,
      author: viewer,
      emoji: parsed.data.emoji,
      note: parsed.data.note || null,
    })
    .onConflictDoUpdate({
      target: [reactions.entryId, reactions.author],
      set: {
        emoji: parsed.data.emoji,
        note: parsed.data.note || null,
        seenAt: null, // a changed reaction re-announces
      },
    });

  revalidatePath("/timeline");
  return { ok: true };
}

// Remove the viewer's reaction on an entry (re-tap the active emoji).
export async function removeReaction(input: {
  entryId: string;
}): Promise<{ ok: boolean }> {
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  if (!z.string().uuid().safeParse(input.entryId).success) return { ok: false };

  await db
    .delete(reactions)
    .where(
      and(eq(reactions.entryId, input.entryId), eq(reactions.author, viewer)),
    );

  revalidatePath("/timeline");
  return { ok: true };
}

// Mark reactions as seen once their float has shown. Ownership-checked: only
// reactions on the viewer's OWN entries can be marked (you only get floats for
// your own entries).
export async function markReactionsSeen(input: {
  ids: string[];
}): Promise<{ ok: boolean }> {
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  const ids = (input.ids ?? []).filter(
    (i) => z.string().uuid().safeParse(i).success,
  );
  if (ids.length === 0) return { ok: true };

  // The set of those ids whose entry is authored by the viewer.
  const owned = await db
    .select({ id: reactions.id })
    .from(reactions)
    .innerJoin(entries, eq(reactions.entryId, entries.id))
    .where(and(inArray(reactions.id, ids), eq(entries.author, viewer)));

  const ownedIds = owned.map((r) => r.id);
  if (ownedIds.length === 0) return { ok: true };

  await db
    .update(reactions)
    .set({ seenAt: new Date() })
    .where(inArray(reactions.id, ownedIds));

  return { ok: true };
}
