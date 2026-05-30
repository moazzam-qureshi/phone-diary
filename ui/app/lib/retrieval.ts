import "server-only";
import {
  and,
  desc,
  gte,
  ilike,
  or,
  eq,
  isNotNull,
  type SQL,
} from "drizzle-orm";
import type { Author } from "@/app/lib/identity-shared";
import { db } from "@/app/lib/db/client";
import { entries, type Entry } from "@/app/lib/db/schema";
import {
  ENTRY_TYPES,
  CATEGORIES,
  type Category,
  type EntryType,
} from "@/app/lib/types";

const MAX_ENTRIES = 150;

// Crude relative-date detection -> a `from` cutoff (ms). null = no date filter.
function detectSince(q: string): Date | null {
  const s = q.toLowerCase();
  const now = Date.now();
  const day = 86_400_000;
  if (/\btoday\b/.test(s)) return new Date(now - day);
  if (/\byesterday\b/.test(s)) return new Date(now - 2 * day);
  if (/\b(this|last|past)\s+week\b/.test(s)) return new Date(now - 7 * day);
  if (/\b(this|last|past)\s+month\b/.test(s)) return new Date(now - 30 * day);
  if (/\b(this|last|past)\s+(quarter|3 months)\b/.test(s))
    return new Date(now - 90 * day);
  if (/\b(this|last|past)\s+year\b/.test(s)) return new Date(now - 365 * day);
  return null;
}

function detectType(q: string): EntryType | null {
  const upper = q.toUpperCase();
  return ENTRY_TYPES.find((t) => upper.includes(t)) ?? null;
}

function detectCategory(q: string): Category | null {
  const s = q.toLowerCase();
  return CATEGORIES.find((c) => s.includes(c.toLowerCase())) ?? null;
}

// Extract content words for a soft keyword match.
function keywords(q: string): string[] {
  const stop = new Set([
    "the", "and", "for", "with", "what", "when", "where", "how", "why",
    "do", "does", "did", "my", "me", "i", "in", "on", "of", "to", "a", "an",
    "is", "are", "was", "were", "most", "least", "about", "that", "this",
  ]);
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .slice(0, 6);
}

export type RetrievedContext = {
  entries: Entry[];
  appliedFilters: {
    since: string | null;
    type: EntryType | null;
    category: Category | null;
    keywords: string[];
  };
};

export type AskTarget = Author | "both";

// Heuristic context builder for the AI query layer (PRD 4.5, no vector DB).
// `viewer`/`target` add couple's-mode scoping: the model only ever sees entries
// the viewer is allowed to see, optionally narrowed to one person.
export async function buildContext(
  query: string,
  opts: { viewer: Author; target: AskTarget },
): Promise<RetrievedContext> {
  const since = detectSince(query);
  const type = detectType(query);
  const category = detectCategory(query);
  const kws = keywords(query);

  const conds: SQL[] = [];
  if (since) conds.push(gte(entries.createdAt, since));
  if (type) conds.push(eq(entries.type, type));
  if (category) conds.push(eq(entries.category, category));

  // TARGET filter: a specific person -> only their entries. "both" -> no author
  // constraint (legacy null-author entries are included only in "both").
  if (opts.target !== "both") {
    conds.push(eq(entries.author, opts.target));
  }

  // SECRET filter (ALWAYS): the model may only see an entry that is not a
  // locked partner-secret from the viewer's perspective:
  //   is_secret = false  OR  author = viewer  OR  gifted_at IS NOT NULL
  const secretOk = or(
    eq(entries.isSecret, false),
    eq(entries.author, opts.viewer),
    isNotNull(entries.giftedAt),
  );
  if (secretOk) conds.push(secretOk);

  // Soft keyword OR over text + outcome (only narrows if structured filters
  // didn't already; if none of the words appear we still fall back below).
  if (kws.length) {
    const kwConds = kws.flatMap((k) => [
      ilike(entries.text, `%${k}%`),
      ilike(entries.outcome, `%${k}%`),
    ]);
    const kwOr = or(...kwConds);
    if (kwOr) conds.push(kwOr);
  }

  let rows = await db
    .select()
    .from(entries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(entries.createdAt))
    .limit(MAX_ENTRIES);

  // Fallback: if keyword filtering zeroed out results, retry without keywords
  // so the model still has the structured slice (or recent entries) to reason on.
  if (rows.length === 0) {
    const structural: SQL[] = [];
    if (since) structural.push(gte(entries.createdAt, since));
    if (type) structural.push(eq(entries.type, type));
    if (category) structural.push(eq(entries.category, category));
    if (opts.target !== "both") {
      structural.push(eq(entries.author, opts.target));
    }
    // Same secret filter as above — never relax visibility in the fallback.
    const s2 = or(
      eq(entries.isSecret, false),
      eq(entries.author, opts.viewer),
      isNotNull(entries.giftedAt),
    );
    if (s2) structural.push(s2);
    rows = await db
      .select()
      .from(entries)
      .where(structural.length ? and(...structural) : undefined)
      .orderBy(desc(entries.createdAt))
      .limit(MAX_ENTRIES);
  }

  return {
    entries: rows,
    appliedFilters: {
      since: since ? since.toISOString() : null,
      type,
      category,
      keywords: kws,
    },
  };
}

// Compact, token-frugal serialization for the LLM context window.
export function serializeEntries(rows: Entry[]): string {
  return rows
    .map((e) => {
      const parts = [
        `[${e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt}]`,
        e.type,
        e.category ? `(${e.category})` : "",
        "—",
        e.text.replace(/\s+/g, " ").slice(0, 500),
      ];
      if (e.outcome) {
        parts.push(
          `| OUTCOME${
            e.outcomeSuccess === true
              ? "(success)"
              : e.outcomeSuccess === false
                ? "(failure)"
                : ""
          }: ${e.outcome.replace(/\s+/g, " ").slice(0, 300)}`,
        );
        if (e.outcomeAt) {
          parts.push(
            `@${e.outcomeAt instanceof Date ? e.outcomeAt.toISOString() : e.outcomeAt}`,
          );
        }
      }
      if (e.decisionLatencyMs != null) {
        parts.push(`| latency_ms=${e.decisionLatencyMs}`);
      }
      return parts.filter(Boolean).join(" ");
    })
    .join("\n");
}
