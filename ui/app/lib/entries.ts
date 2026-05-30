import "server-only";
import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import { db } from "@/app/lib/db/client";
import { entries, type Entry } from "@/app/lib/db/schema";
import {
  ENTRY_TYPES,
  CATEGORIES,
  type Category,
  type EntryType,
} from "@/app/lib/types";
import { entryVisibility, type VisibleEntry } from "@/app/lib/visibility";
import { AUTHORS, type Author } from "@/app/lib/identity-shared";

export function parseTypeFilter(v: string | undefined): EntryType | null {
  return v && (ENTRY_TYPES as readonly string[]).includes(v)
    ? (v as EntryType)
    : null;
}

export function parseCategoryFilter(v: string | undefined): Category | null {
  return v && (CATEGORIES as readonly string[]).includes(v)
    ? (v as Category)
    : null;
}

export function parseAuthorFilter(v: string | undefined): Author | null {
  return v && (AUTHORS as readonly string[]).includes(v) ? (v as Author) : null;
}

// Quick date ranges (the only values the timeline filter offers). null = all.
export const RANGES = ["today", "7d", "30d"] as const;
export type Range = (typeof RANGES)[number];

export function parseRangeFilter(v: string | undefined): Range | null {
  return v && (RANGES as readonly string[]).includes(v) ? (v as Range) : null;
}

// A range -> the "created since" cutoff. Uses local-day boundaries so "today"
// means since midnight, not a rolling 24h.
function rangeSince(range: Range): Date {
  const now = new Date();
  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 86_400_000);
}

// Reverse-chronological feed, redacted for `viewer` (PRD 4.4 + couple's mode).
// Locked partner-secrets are returned as stubs WITHOUT text — the redaction
// happens before data leaves the server.
export async function listEntries(
  viewer: Author,
  filters: {
    type?: EntryType | null;
    category?: Category | null;
    author?: Author | null;
    range?: Range | null;
    limit?: number;
  },
): Promise<VisibleEntry[]> {
  const conds: SQL[] = [];
  if (filters.type) conds.push(eq(entries.type, filters.type));
  if (filters.category) conds.push(eq(entries.category, filters.category));
  if (filters.author) conds.push(eq(entries.author, filters.author));
  if (filters.range) conds.push(gte(entries.createdAt, rangeSince(filters.range)));

  const rows = await db
    .select()
    .from(entries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(entries.createdAt))
    .limit(filters.limit ?? 500);

  return rows.map((r) => entryVisibility(r, viewer));
}

// Lookup map id -> short label, used to show what a decision's execution links to.
export async function entryLabelMap(): Promise<Map<string, Entry>> {
  const rows = await db.select().from(entries);
  return new Map(rows.map((r) => [r.id, r]));
}
