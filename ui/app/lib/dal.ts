import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, SESSION_COOKIE } from "@/app/lib/session";

// The real authorization gate. Called at the top of every protected page,
// Server Action, and Route Handler — the Proxy is only an optimistic
// pre-filter (see proxy.ts). Memoized per render pass via React `cache`.
export const verifySession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session) {
    redirect("/login");
  }
  return { isAuth: true as const };
});

// Non-redirecting variant for Route Handlers that need to return a 401.
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decrypt(token);
}
