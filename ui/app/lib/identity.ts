import "server-only";
import { cookies } from "next/headers";

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

// Current identity for this device. null = not chosen yet (honor system).
export async function getViewer(): Promise<Author | null> {
  const v = (await cookies()).get(AUTHOR_COOKIE)?.value;
  return isAuthor(v) ? v : null;
}

// For write paths once identity is expected. Throws if unset so a mid-deploy
// session with no identity cannot create a null-author row.
export async function requireViewer(): Promise<Author> {
  const v = await getViewer();
  if (!v) throw new Error("NO_IDENTITY");
  return v;
}
