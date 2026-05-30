"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTHOR_COOKIE, isAuthor } from "@/app/lib/identity";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year — it's a device preference

export async function setViewer(author: string): Promise<{ ok: boolean }> {
  if (!isAuthor(author)) return { ok: false };
  const store = await cookies();
  store.set(AUTHOR_COOKIE, author, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  revalidatePath("/");
  return { ok: true };
}
