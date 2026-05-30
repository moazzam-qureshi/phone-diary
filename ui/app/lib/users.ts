import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/app/lib/db/client";
import { users } from "@/app/lib/db/schema";
import { hashPassword, verifyPassword } from "@/app/lib/session";
import { AUTHORS, type Author } from "@/app/lib/identity-shared";

// Which slots are claimed (passcode set). Drives first-run setup vs login.
export type SetupState = {
  author_a: boolean;
  author_b: boolean;
};

export async function setupState(): Promise<SetupState> {
  const rows = await db
    .select({ author: users.author, hash: users.passcodeHash })
    .from(users);
  const claimed = new Set(
    rows.filter((r) => r.hash != null).map((r) => r.author),
  );
  return {
    author_a: claimed.has("author_a"),
    author_b: claimed.has("author_b"),
  };
}

export async function isClaimed(author: Author): Promise<boolean> {
  const [row] = await db
    .select({ hash: users.passcodeHash })
    .from(users)
    .where(eq(users.author, author))
    .limit(1);
  return !!row?.hash;
}

// Claim a slot by setting its passcode. Fails if already claimed (no silent
// overwrite — that would let someone hijack the other person's slot).
export async function claimSlot(
  author: Author,
  passcode: string,
): Promise<{ ok: boolean; error?: string }> {
  if (await isClaimed(author)) {
    return { ok: false, error: "ALREADY SET UP" };
  }
  const hash = await hashPassword(passcode);
  // upsert: a row may exist with a null hash, or not exist at all.
  await db
    .insert(users)
    .values({ author, passcodeHash: hash })
    .onConflictDoUpdate({
      target: users.author,
      set: { passcodeHash: hash },
    });
  return { ok: true };
}

// Identify the author whose passcode matches. null = no match (wrong passcode).
// Constant-time compare per-row via verifyPassword's hash comparison.
export async function authorForPasscode(
  passcode: string,
): Promise<Author | null> {
  const rows = await db
    .select({ author: users.author, hash: users.passcodeHash })
    .from(users);
  for (const a of AUTHORS) {
    const row = rows.find((r) => r.author === a);
    if (row?.hash && (await verifyPassword(passcode, row.hash))) {
      return a;
    }
  }
  return null;
}
