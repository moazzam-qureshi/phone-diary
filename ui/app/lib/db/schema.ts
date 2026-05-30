import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
  },
  (table) => [
    index("entries_created_at_idx").on(table.createdAt),
    index("entries_type_idx").on(table.type),
    index("entries_category_idx").on(table.category),
    index("entries_executes_entry_id_idx").on(table.executesEntryId),
  ],
);

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
