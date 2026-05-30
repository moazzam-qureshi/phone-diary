import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE } from "@/app/lib/session";

// Next.js 16 renamed Middleware -> Proxy. This is an OPTIMISTIC redirect layer
// only; the real gate is verifySession() in the DAL (called by every page,
// action, and route handler). Proxy runs on the Node runtime here.

const PUBLIC_PATHS = ["/login"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.includes(path);

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  return NextResponse.next();
}

// Skip static assets, Next internals, the API (handlers self-gate), and the
// publicly-served audio files under /sounds.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sounds|.*\\.(?:mp3|wav|ogg|svg|png|ico)$).*)",
  ],
};
