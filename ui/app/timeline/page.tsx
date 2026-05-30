import { redirect } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import {
  listEntries,
  parseCategoryFilter,
  parseTypeFilter,
} from "@/app/lib/entries";
import { getViewer } from "@/app/lib/identity";
import TimelineList from "@/app/components/TimelineList";

// Per-request: reads cookies (auth) + DB + URL searchParams. Never prerender.
export const dynamic = "force-dynamic";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  await verifySession();
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const sp = await searchParams;
  const type = parseTypeFilter(sp.type);
  const category = parseCategoryFilter(sp.category);
  const entries = await listEntries(viewer, { type, category });

  // TimelineList renders its own keitai Screen (status bar + soft keys).
  return <TimelineList entries={entries} viewer={viewer} />;
}
