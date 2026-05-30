import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, decrypt } from "@/app/lib/session";
import { type Author } from "@/app/lib/identity-shared";

// Re-export the client-safe constants so server modules keep a single import
// point (`@/app/lib/identity`). Client components must import from
// `@/app/lib/identity-shared` instead (this module is server-only).
export {
  AUTHORS,
  DISPLAY_NAMES,
  AUTHOR_COOKIE,
  isAuthor,
  partnerOf,
  type Author,
} from "@/app/lib/identity-shared";

// Current identity = who the signed session says is logged in. Identity is now
// proven by passcode at login (not a freely-settable cookie), so this is
// tamper-proof. null = not logged in.
export async function getViewer(): Promise<Author | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  return session?.author ?? null;
}

// For write paths. Throws if not logged in (route/page guards prevent this in
// normal flow, but it keeps writes from ever producing a null-author row).
export async function requireViewer(): Promise<Author> {
  const v = await getViewer();
  if (!v) throw new Error("NO_IDENTITY");
  return v;
}
