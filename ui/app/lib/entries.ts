import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/app/lib/db/client";
import { entries, type Entry } from "@/app/lib/db/schema";
import {
  ENTRY_TYPES,
  CATEGORIES,
  type Category,
  type EntryType,
} from "@/app/lib/types";
import { entryVisibility, type VisibleEntry } from "@/app/lib/visibility";
import type { Author } from "@/app/lib/identity-shared";

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

// Reverse-chronological feed, redacted for `viewer` (PRD 4.4 + couple's mode).
// Locked partner-secrets are returned as stubs WITHOUT text — the redaction
// happens before data leaves the server.
export async function listEntries(
  viewer: Author,
  filters: {
    type?: EntryType | null;
    category?: Category | null;
    limit?: number;
  },
): Promise<VisibleEntry[]> {
  const conds = [];
  if (filters.type) conds.push(eq(entries.type, filters.type));
  if (filters.category) conds.push(eq(entries.category, filters.category));

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
