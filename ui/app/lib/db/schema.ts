import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { EntryMetadata } from "@/app/lib/types";

// Event classification ("Journey" vocabulary) and optional category.
export const entryType = pgEnum("entry_type", [
  "TURN",
  "PULSE",
  "MIRROR",
  "FORGE",
  "TRACE",
]);
export const entryCategory = pgEnum("entry_category", [
  "Business",
  "Health",
  "Mind",
  "Execution",
  "Life",
]);

// Couple's mode: who wrote the entry. Stable values; display names live in
// app/lib/identity.ts. Nullable — legacy (pre-feature) entries have no author.
export const author = pgEnum("author", ["author_a", "author_b"]);

// Per-person credentials. One row per author; passcodeHash null = slot not yet
// claimed (first-run setup). The passcode both authenticates AND proves
// identity, so secrets are real (you can't become the other without theirs).
export const users = pgTable("users", {
  author: author("author").primaryKey(),
  passcodeHash: text("passcode_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Captured as raw text first; type/category are assigned LATER by the AI
    // classifier (or overridden manually), so both are nullable.
    type: entryType("type"),
    category: entryCategory("category"),
    text: text("text").notNull(),

    // AI classification metadata.
    // classifiedAt: when the AI last tagged this entry (null = not yet classified).
    // typeConfidence: AI's 0..1 confidence in the assigned type.
    // typeLocked: true once the user manually overrides, so re-classify passes skip it.
    classifiedAt: timestamp("classified_at", { withTimezone: true }),
    typeConfidence: bigint("type_confidence_pct", { mode: "number" }),
    typeLocked: boolean("type_locked").notNull().default(false),

    // Outcome attachment (PRD 4.3) — filled in later, hence all nullable.
    // outcomeSuccess is tri-state: null = no outcome yet, true/false = result.
    outcome: text("outcome"),
    outcomeSuccess: boolean("outcome_success"),
    outcomeNotes: text("outcome_notes"),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }),

    // Persisted decision -> execution linkage (PRD 4.6).
    // This entry "executes" / resolves the referenced decision entry.
    executesEntryId: uuid("executes_entry_id").references(
      (): AnyPgColumn => entries.id,
      { onDelete: "set null" },
    ),
    decisionLatencyMs: bigint("decision_latency_ms", { mode: "number" }),

    metadata: jsonb("metadata").$type<EntryMetadata>().default({}),

    // Couple's mode (see docs spec 2026-05-30). author null = legacy entry.
    author: author("author"),
    // is_secret: partner sees a locked placeholder, not the text.
    isSecret: boolean("is_secret").notNull().default(false),
    // gifted_at: non-null = author revealed this secret to the partner.
    giftedAt: timestamp("gifted_at", { withTimezone: true }),
  },
  (table) => [
    index("entries_created_at_idx").on(table.createdAt),
    index("entries_type_idx").on(table.type),
    index("entries_category_idx").on(table.category),
    index("entries_executes_entry_id_idx").on(table.executesEntryId),
    index("entries_author_idx").on(table.author),
  ],
);

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

// Partner reactions: one emoji (+ optional one-line note) per person per entry.
// `author` = who reacted. `seenAt` null = the entry's owner hasn't been shown
// the floating notification yet (server-side so it floats once across devices).
export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    author: author("author").notNull(),
    emoji: text("emoji").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (table) => [
    // One reaction per person per entry (upsert target).
    uniqueIndex("reactions_entry_author_idx").on(table.entryId, table.author),
    index("reactions_entry_id_idx").on(table.entryId),
  ],
);

export type Reaction = typeof reactions.$inferSelect;
