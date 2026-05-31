// Shared domain types for the Analog Life Log System.
// These mirror the Postgres enums defined in db/schema.ts.
//
// Entries are captured as raw text and classified into one of these types
// later by the AI (or overridden manually). The stored enum VALUES are kept
// stable (TURN/PULSE/…) so no migration is ever needed; the cosy, human
// labels people actually see live in TYPE_LABEL below.

export const ENTRY_TYPES = ["TURN", "PULSE", "MIRROR", "FORGE", "TRACE"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

// Cosy, plain display label for each type — what the UI and AI show. Maps the
// stable internal enum to friendly words (display-only; DB is untouched).
export const TYPE_LABEL: Record<EntryType, string> = {
  TURN: "Decision",
  PULSE: "Feeling",
  MIRROR: "Realization",
  FORGE: "Did",
  TRACE: "Note",
};

// Human-readable meaning of each type (shown in UI hints + sent to the AI).
export const TYPE_MEANING: Record<EntryType, string> = {
  TURN: "a decision / fork in the road",
  PULSE: "how I feel / mental state",
  MIRROR: "a realization about myself",
  FORGE: "what I built / did",
  TRACE: "a plain note / catch-all",
};

export const CATEGORIES = [
  "Business",
  "Health",
  "Mind",
  "Execution",
  "Life",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Free-form metadata bag stored as jsonb on each entry.
export type EntryMetadata = {
  decisionLatency?: number;
  [key: string]: unknown;
};
