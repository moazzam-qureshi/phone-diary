import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import {
  listEntries,
  parseCategoryFilter,
  parseTypeFilter,
  parseAuthorFilter,
  parseRangeFilter,
} from "@/app/lib/entries";
import { getViewer } from "@/app/lib/identity";
import {
  reactionsForEntries,
  unseenReactionsForViewer,
} from "@/app/lib/reactions";
import type { Reaction } from "@/app/lib/db/schema";
import TimelineList from "@/app/components/TimelineList";
import ReactionToasts from "@/app/components/ReactionToasts";

// Per-request: reads cookies (auth) + DB + URL searchParams. Never prerender.
export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    category?: string;
    author?: string;
    range?: string;
  }>;
}) {
  await verifySession();
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const sp = await searchParams;
  const type = parseTypeFilter(sp.type);
  const category = parseCategoryFilter(sp.category);
  const author = parseAuthorFilter(sp.author);
  const range = parseRangeFilter(sp.range);
  const entries = await listEntries(viewer, { type, category, author, range });

  // Attach reactions for every full entry (locked stubs have no reactions).
  const fullIds = entries
    .filter((v) => v.kind === "full")
    .map((v) => (v as { entry: { id: string } }).entry.id);
  const reactionMap = await reactionsForEntries(fullIds);
  const reactionsByEntry: Record<string, Reaction[]> = {};
  for (const [id, list] of reactionMap) reactionsByEntry[id] = list;

  const toasts = await unseenReactionsForViewer(viewer);

  // TimelineList renders its own keitai Screen (status bar + soft keys).
  return (
    <>
      <ReactionToasts toasts={toasts} />
      <TimelineList
        entries={entries}
        viewer={viewer}
        reactionsByEntry={reactionsByEntry}
      />
    </>
  );
}
