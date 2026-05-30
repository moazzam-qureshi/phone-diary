import type { Entry } from "@/app/lib/db/schema";
import type { Author } from "@/app/lib/identity-shared";

// A locked stub carries NO content — only what the placeholder card needs.
export type LockedStub = {
  id: string;
  createdAt: Date;
  author: Author; // a locked entry always has a (partner) author
  locked: true;
};

// What the timeline renders: either a full row, or a redacted stub.
export type VisibleEntry =
  | { kind: "full"; entry: Entry; gift: boolean }
  | { kind: "locked"; stub: LockedStub };

// THE visibility rule (spec §1). Pure; no I/O. `gift` flags a revealed secret
// from the partner so the UI can tag/animate it.
export function entryVisibility(entry: Entry, viewer: Author): VisibleEntry {
  const own = entry.author === viewer;
  const legacy = entry.author === null;
  const gifted = entry.giftedAt != null;

  if (own || legacy || !entry.isSecret || gifted) {
    return {
      kind: "full",
      entry,
      gift: !own && !legacy && entry.isSecret && gifted,
    };
  }
  // partner's un-gifted secret -> redacted stub (no text/outcome)
  return {
    kind: "locked",
    stub: {
      id: entry.id,
      createdAt: entry.createdAt as Date,
      author: entry.author as Author,
      locked: true,
    },
  };
}
