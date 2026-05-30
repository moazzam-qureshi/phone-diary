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
import TimelineList from "@/app/components/TimelineList";

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

  // TimelineList renders its own keitai Screen (status bar + soft keys).
  return <TimelineList entries={entries} viewer={viewer} />;
}
