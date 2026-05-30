// Client-safe identity constants. NO "server-only" here — client components
// (GiftCard, AskPanel) import these. The server-only cookie logic lives in
// identity.ts, which re-exports everything below so server code has one import.

// Stable internal author values. Display names are separate constants below,
// so renaming a person is a one-line edit and never needs a DB migration.
export const AUTHORS = ["author_a", "author_b"] as const;
export type Author = (typeof AUTHORS)[number];

// App content, intentionally NOT env vars (these never differ per deployment).
export const DISPLAY_NAMES: Record<Author, string> = {
  author_a: "Moazzam",
  author_b: "Nuha",
};

export const AUTHOR_COOKIE = "als_author";

export function isAuthor(v: string | undefined | null): v is Author {
  return v === "author_a" || v === "author_b";
}

export function partnerOf(a: Author): Author {
  return a === "author_a" ? "author_b" : "author_a";
}
