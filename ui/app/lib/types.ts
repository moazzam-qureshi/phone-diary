// Shared domain types for the Analog Life Log System.
// These mirror the Postgres enums defined in db/schema.ts.
//
// "Journey" vocabulary — entries are captured as raw text and classified
// into one of these types later by the AI (or overridden manually).

export const ENTRY_TYPES = ["TURN", "PULSE", "MIRROR", "FORGE", "TRACE"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

// Human-readable meaning of each type (shown in UI hints + sent to the AI).
export const TYPE_MEANING: Record<EntryType, string> = {
  TURN: "a decision / fork in the road",
  PULSE: "how I feel / mental state",
  MIRROR: "a realization about myself",
  FORGE: "what I built / did",
  TRACE: "raw catch-all",
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
