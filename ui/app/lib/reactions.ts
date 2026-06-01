import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/app/lib/db/client";
import { reactions, entries, type Reaction } from "@/app/lib/db/schema";
import { DISPLAY_NAMES, type Author } from "@/app/lib/identity-shared";
import type { ReactionToast } from "@/app/lib/reactions-shared";

// Batch-fetch reactions for the given entries, grouped by entryId.
export async function reactionsForEntries(
  entryIds: string[],
): Promise<Map<string, Reaction[]>> {
  const map = new Map<string, Reaction[]>();
  if (entryIds.length === 0) return map;

  const rows = await db
    .select()
    .from(reactions)
    .where(inArray(reactions.entryId, entryIds))
    .orderBy(desc(reactions.createdAt));

  for (const r of rows) {
    const list = map.get(r.entryId);
    if (list) list.push(r);
    else map.set(r.entryId, [r]);
  }
  return map;
}

// Reactions on the viewer's OWN entries that haven't been shown yet
// (seen_at IS NULL) — these float in as toasts on app open.
export async function unseenReactionsForViewer(
  viewer: Author,
): Promise<ReactionToast[]> {
  const rows = await db
    .select({
      id: reactions.id,
      emoji: reactions.emoji,
      note: reactions.note,
      entryId: reactions.entryId,
      author: reactions.author,
      text: entries.text,
    })
    .from(reactions)
    .innerJoin(entries, eq(reactions.entryId, entries.id))
    .where(and(eq(entries.author, viewer), isNull(reactions.seenAt)))
    .orderBy(desc(reactions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    emoji: r.emoji,
    note: r.note,
    entryId: r.entryId,
    entrySnippet: r.text.replace(/\s+/g, " ").slice(0, 80),
    reactorName: DISPLAY_NAMES[r.author as Author],
  }));
}
