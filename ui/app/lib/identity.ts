import "server-only";
import { cookies } from "next/headers";
import { AUTHOR_COOKIE, isAuthor, type Author } from "@/app/lib/identity-shared";

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
