import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/app/lib/env";
import { isAuthor, type Author } from "@/app/lib/identity-shared";

export const SESSION_COOKIE = "als_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// The session now carries WHO is logged in. `author` is set by the passcode at
// login, embedded in the signed JWT — so identity is tamper-proof (you can't
// become the other person without their passcode). This is what makes the
// secret feature real.
type SessionPayload = { sub: "owner"; author: Author };

function key() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
    });
    const a = payload.author;
    if (payload.sub === "owner" && typeof a === "string" && isAuthor(a)) {
      return { sub: "owner", author: a };
    }
    return null;
  } catch {
    return null;
  }
}

export async function createSession(author: Author): Promise<void> {
  const token = await encrypt({ sub: "owner", author });
  const expires = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// --- Password verification (SHA-256 + constant-time compare) ---

export async function hashPassword(plain: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(plain),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string comparison to avoid timing leaks.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Compare a plaintext passcode against a stored hash (constant-time).
export async function verifyPassword(
  plain: string,
  expectedHash: string,
): Promise<boolean> {
  const hashed = await hashPassword(plain);
  return timingSafeEqual(hashed, expectedHash.toLowerCase());
}
