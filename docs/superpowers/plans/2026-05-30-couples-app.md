# Couple's Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn phone-diary into a two-person ("couple's") app: every entry is attributed to Moazzam or Nuha, either can mark entries secret (partner sees a locked placeholder), and either can "gift" a secret to reveal it with a celebrated open moment — all without changing the existing shared-password auth.

**Architecture:** Identity is an honor-system cookie (`als_author`), fully decoupled from the auth session (`als_session`, untouched). A new `author` enum + `is_secret`/`gifted_at` columns drive a single server-side **visibility rule** enforced in the data layer (`entries.ts`) and mirrored in AI retrieval (`retrieval.ts`), so secret text never reaches the browser or the LLM. Gifts flip a secret to visible-to-partner; the unwrap animation + tone fire client-side, with "already opened" tracked in `localStorage`.

**Tech Stack:** Next.js 16.2.6 (App Router, Server Actions, Route Handlers), React 19, Drizzle ORM + Postgres, jose (auth, untouched), Zod, Tailwind v4, Web Audio (synthesized sounds).

---

## ⚠️ Read before starting

- **Next.js 16, not your training data.** Before editing any App Router file, skim the relevant guide under `ui/node_modules/next/dist/docs/01-app/`. `cookies()` and `headers()` are **async** — always `await`. Never create `middleware.ts` (it's `proxy.ts` here).
- **No test framework exists.** `package.json` has no test runner and the repo has zero tests. Installing one is **out of scope** for this feature. Verification in this plan uses:
  - **Typecheck:** `cd ui && npx tsc --noEmit`
  - **Lint:** `cd ui && npm run lint`
  - **Build:** `cd ui && npm run build`
  - **Pure-logic check:** for the visibility rule (Task 6) a tiny throwaway `tsx` script asserts behavior, then is deleted. This gives TDD-style red/green without adding a permanent harness.
  - **Manual smoke:** explicit click-through steps where logic can't be unit-checked (UI, cookies, streaming).
- **Run all commands from `ui/`** unless stated otherwise (the Next app lives in `ui/`, repo root is Docker/docs only).
- **DB must be up** for `db:generate`/`db:migrate`/build-with-DB and manual smoke: from repo root `docker compose -f docker-compose.dev.yml up -d`, and `ui/.env` must have `DATABASE_URL`, `SESSION_SECRET`, `APP_PASSWORD_HASH`, `OPENROUTER_API_KEY`.

---

## File Structure

**New files:**
- `ui/app/lib/identity.ts` — `Author` type, `AUTHORS`, `DISPLAY_NAMES`, `getViewer`, `requireViewer`, `partnerOf`, `AUTHOR_COOKIE`.
- `ui/app/lib/visibility.ts` — pure `entryVisibility(entry, viewer)` rule + `VisibleEntry` type (no I/O, unit-testable).
- `ui/app/actions/identity.ts` — `setViewer` server action.
- `ui/app/components/IdentityGate.tsx` — one-time "who am I" pick screen.
- `ui/app/components/SwitchIdentity.tsx` — small corner affordance to change identity.
- `ui/app/components/LockedEntryCard.tsx` — locked-secret placeholder card.
- `ui/app/components/GiftCard.tsx` — wrapped-gift card with tap-to-open unwrap.
- One Drizzle migration under `ui/drizzle/` (generated).

**Modified files:**
- `ui/app/lib/db/schema.ts` — `author` pgEnum + `author`/`isSecret`/`giftedAt` columns + index.
- `ui/app/lib/entries.ts` — viewer-aware `listEntries` returning `VisibleEntry[]`.
- `ui/app/lib/retrieval.ts` — `buildContext(query, { viewer, target })` visibility+target filter.
- `ui/app/actions/entries.ts` — `createEntry` (author + isSecret); new `setSecret`, `giftEntry`.
- `ui/app/api/ask/route.ts` — accept `target`, read viewer, pass to `buildContext`.
- `ui/app/lib/prompt.ts` — target-aware system prompt using display names.
- `ui/app/components/CaptureScreen.tsx` — secret toggle.
- `ui/app/components/EntryCard.tsx` — own-secret marker, lock toggle, gift control, gift-from tag.
- `ui/app/components/TimelineList.tsx` — dispatch full / locked / gift cards; accept `viewer`.
- `ui/app/components/AskPanel.tsx` — target selector.
- `ui/app/hooks/useAudio.ts` — `playGiftOpen()` synthesized tone + expose via `useAudio`.
- `ui/app/page.tsx` (home) — render `IdentityGate` when viewer unset, else `HomeMenu`.
- `ui/app/timeline/page.tsx` — pass viewer into `listEntries` + `TimelineList`.
- `ui/app/components/StatusBar.tsx` — "🎁 a gift is waiting" nudge (if present; verified in Task 12).

> **Naming note:** The spec mentioned sourcing an audio asset; that is **stale** — `useAudio.ts` is fully synthesized (no files). The gift sound is a synthesized `playGiftOpen()` matching `playClick()`. The spec also used illustrative component names; finalized names are above.

---

## Task 1: Author enum + identity constants (no DB yet)

Pure constants/types first so every later task can import a stable `Author`.

**Files:**
- Create: `ui/app/lib/identity.ts`

- [ ] **Step 1: Write `identity.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS (no errors). `cookies()` is awaited; `server-only` import is fine in a server module.

- [ ] **Step 3: Commit**

```bash
git add ui/app/lib/identity.ts
git commit -m "feat(identity): author constants + viewer cookie helpers"
```

---

## Task 2: `setViewer` server action

**Files:**
- Create: `ui/app/actions/identity.ts`

- [ ] **Step 1: Write the action**

```ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AUTHOR_COOKIE, isAuthor } from "@/app/lib/identity";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year — it's a device preference

export async function setViewer(
  author: string,
): Promise<{ ok: boolean }> {
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
```

- [ ] **Step 2: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add ui/app/actions/identity.ts
git commit -m "feat(identity): setViewer server action"
```

---

## Task 3: Schema — author enum + secret/gift columns

**Files:**
- Modify: `ui/app/lib/db/schema.ts`

- [ ] **Step 1: Add the `author` enum after the existing enums**

Insert after the `entryCategory` enum block (currently ends ~line 29):

```ts
// Couple's mode: who wrote the entry. Stable values; display names live in
// app/lib/identity.ts. Nullable — legacy (pre-feature) entries have no author.
export const author = pgEnum("author", ["author_a", "author_b"]);
```

- [ ] **Step 2: Add the three columns inside `entries` (after the `metadata` column, before the closing `}`)**

```ts
    // Couple's mode (see docs spec 2026-05-30). author null = legacy entry.
    author: author("author"),
    // is_secret: partner sees a locked placeholder, not the text.
    isSecret: boolean("is_secret").notNull().default(false),
    // gifted_at: non-null = author revealed this secret to the partner.
    giftedAt: timestamp("gifted_at", { withTimezone: true }),
```

- [ ] **Step 3: Add an index for author in the index array**

In the `(table) => [ ... ]` array, add:

```ts
    index("entries_author_idx").on(table.author),
```

- [ ] **Step 4: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS. (`boolean`, `timestamp`, `pgEnum`, `index` are already imported at the top of schema.ts.)

- [ ] **Step 5: Generate the migration**

Run: `cd ui && npm run db:generate`
Expected: a new SQL file appears under `ui/drizzle/` creating the `author` enum, adding three columns, and the index. Open it and confirm it only ADDs (no drops of existing columns).

- [ ] **Step 6: Apply the migration (DB must be up)**

Run: `cd ui && npm run db:migrate`
Expected: "migrations applied" with no error. Existing rows get `author = NULL`, `is_secret = false`, `gifted_at = NULL`.

- [ ] **Step 7: Commit**

```bash
git add ui/app/lib/db/schema.ts ui/drizzle/
git commit -m "feat(db): author enum + is_secret/gifted_at columns"
```

---

## Task 4: Pure visibility rule + `VisibleEntry` type (TDD via throwaway script)

This is the security-critical core. Pure function, no I/O, so we red/green it with a temporary `tsx` script.

**Files:**
- Create: `ui/app/lib/visibility.ts`
- Temp: `ui/scripts/visibility.check.ts` (deleted in Step 6)

- [ ] **Step 1: Write the failing check script**

```ts
// TEMP verification — deleted after green. Run with: npx tsx scripts/visibility.check.ts
import { entryVisibility } from "../app/lib/visibility";
import type { Entry } from "../app/lib/db/schema";

function base(over: Partial<Entry>): Entry {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    createdAt: new Date(0),
    type: null, category: null, text: "SECRET TEXT",
    classifiedAt: null, typeConfidence: null, typeLocked: false,
    outcome: null, outcomeSuccess: null, outcomeNotes: null, outcomeAt: null,
    executesEntryId: null, decisionLatencyMs: null, metadata: {},
    author: "author_b", isSecret: false, giftedAt: null,
    ...over,
  } as Entry;
}

let failures = 0;
function expect(name: string, cond: boolean) {
  if (!cond) { failures++; console.error("FAIL:", name); }
  else console.log("ok:", name);
}

// own entry (incl. own secret) -> full
expect("own full", entryVisibility(base({ author: "author_a" }), "author_a").kind === "full");
expect("own secret full", entryVisibility(base({ author: "author_a", isSecret: true }), "author_a").kind === "full");
// legacy (null author) -> full to anyone
expect("legacy full", entryVisibility(base({ author: null }), "author_a").kind === "full");
// partner non-secret -> full
expect("partner open full", entryVisibility(base({ author: "author_b", isSecret: false }), "author_a").kind === "full");
// partner secret, not gifted -> locked, and NO text leaks
{
  const v = entryVisibility(base({ author: "author_b", isSecret: true }), "author_a");
  expect("partner secret locked", v.kind === "locked");
  expect("locked has no text", JSON.stringify(v).indexOf("SECRET TEXT") === -1);
}
// partner secret, gifted -> full (gift)
expect("partner gifted full", entryVisibility(base({ author: "author_b", isSecret: true, giftedAt: new Date(1) }), "author_a").kind === "full");

console.log(failures === 0 ? "\nALL GREEN" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it — expect failure (module not found)**

Run: `cd ui && npx tsx scripts/visibility.check.ts`
Expected: FAIL — cannot find `../app/lib/visibility` (we haven't written it).

- [ ] **Step 3: Write `visibility.ts`**

```ts
import type { Entry } from "@/app/lib/db/schema";
import type { Author } from "@/app/lib/identity";

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
    return { kind: "full", entry, gift: !own && !legacy && entry.isSecret && gifted };
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
```

- [ ] **Step 4: Run the check — expect green**

Run: `cd ui && npx tsx scripts/visibility.check.ts`
Expected: every line `ok:` then `ALL GREEN`, exit 0. Crucially `locked has no text` passes — secret text never enters the stub.

- [ ] **Step 5: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Delete the throwaway script**

```bash
cd ui && rm scripts/visibility.check.ts
```
(Remove the now-empty `ui/scripts/` dir if nothing else is in it.)

- [ ] **Step 7: Commit**

```bash
git add ui/app/lib/visibility.ts
git commit -m "feat(visibility): pure per-viewer entry visibility rule"
```

---

## Task 5: Viewer-aware reads in `entries.ts`

**Files:**
- Modify: `ui/app/lib/entries.ts`

- [ ] **Step 1: Replace `listEntries` and add a viewer param; map rows through the rule**

Replace the current `listEntries` (lines ~25-40) with:

```ts
import { entryVisibility, type VisibleEntry } from "@/app/lib/visibility";
import type { Author } from "@/app/lib/identity";

// Reverse-chronological feed, redacted for `viewer`. Locked partner-secrets
// are returned as stubs WITHOUT text (the redaction happens before data leaves
// the server).
export async function listEntries(
  viewer: Author,
  filters: {
    type?: EntryType | null;
    category?: Category | null;
    limit?: number;
  },
): Promise<VisibleEntry[]> {
  const conds = [];
  if (filters.type) conds.push(eq(entries.type, filters.type));
  if (filters.category) conds.push(eq(entries.category, filters.category));

  const rows = await db
    .select()
    .from(entries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(entries.createdAt))
    .limit(filters.limit ?? 500);

  return rows.map((r) => entryVisibility(r, viewer));
}
```

> Place the two new `import` lines at the top of the file with the other imports, not inline.

- [ ] **Step 2: Typecheck (expect callers to break — that's next task)**

Run: `cd ui && npx tsc --noEmit`
Expected: errors only in `app/timeline/page.tsx` (calls `listEntries` without a viewer) — fixed in Task 8. `entries.ts` itself compiles. If errors appear in `entries.ts`, fix before moving on.

- [ ] **Step 3: Commit**

```bash
git add ui/app/lib/entries.ts
git commit -m "feat(entries): viewer-aware listEntries returning VisibleEntry"
```

---

## Task 6: Capture writes author + isSecret; add `setSecret` and `giftEntry`

**Files:**
- Modify: `ui/app/actions/entries.ts`

- [ ] **Step 1: Update imports at top of `entries.ts`**

Add to the existing imports:

```ts
import { requireViewer } from "@/app/lib/identity";
import { isNotNull } from "drizzle-orm";
```

(`isNotNull` joins the existing `drizzle-orm` import line; or add a separate import — either compiles.)

- [ ] **Step 2: Extend `createEntry` to tag author + secrecy**

Replace the `CreateSchema` and `createEntry` signature/insert:

```ts
const CreateSchema = z.object({
  text: z.string().trim().min(1),
  isSecret: z.boolean().optional(),
});

export async function createEntry(input: {
  text: string;
  isSecret?: boolean;
}): Promise<CreateEntryResult> {
  await verifySession();

  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false, error: "SET IDENTITY FIRST" };
  }

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "EMPTY ENTRY" };
  }

  const [row] = await db
    .insert(entries)
    .values({
      text: parsed.data.text,
      author: viewer,
      isSecret: parsed.data.isSecret ?? false,
    })
    .returning({ id: entries.id });
```

(The rest of `createEntry` — classify + revalidate + return — is unchanged.)

- [ ] **Step 3: Add `setSecret` (ownership-checked) after `setEntryType`**

```ts
const SecretSchema = z.object({
  id: z.string().uuid(),
  isSecret: z.boolean(),
});

export async function setSecret(input: {
  id: string;
  isSecret: boolean;
}): Promise<{ ok: boolean }> {
  await verifySession();
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  const parsed = SecretSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const [entry] = await db
    .select({ author: entries.author })
    .from(entries)
    .where(eq(entries.id, parsed.data.id))
    .limit(1);
  // Only your OWN entries are lockable; legacy (null author) never lockable.
  if (!entry || entry.author !== viewer) return { ok: false };

  await db
    .update(entries)
    .set({
      isSecret: parsed.data.isSecret,
      // un-secreting clears gift state (it's now fully public)
      ...(parsed.data.isSecret ? {} : { giftedAt: null }),
    })
    .where(eq(entries.id, parsed.data.id));

  revalidatePath("/timeline");
  return { ok: true };
}
```

- [ ] **Step 4: Add `giftEntry` (own + secret required)**

```ts
export async function giftEntry(input: {
  id: string;
}): Promise<{ ok: boolean }> {
  await verifySession();
  let viewer;
  try {
    viewer = await requireViewer();
  } catch {
    return { ok: false };
  }
  if (!z.string().uuid().safeParse(input.id).success) return { ok: false };

  const [entry] = await db
    .select({ author: entries.author, isSecret: entries.isSecret })
    .from(entries)
    .where(eq(entries.id, input.id))
    .limit(1);
  // Can only gift your OWN entry, and only if it is currently a secret.
  if (!entry || entry.author !== viewer || !entry.isSecret) return { ok: false };

  await db
    .update(entries)
    .set({ giftedAt: new Date() })
    .where(eq(entries.id, input.id));

  revalidatePath("/timeline");
  return { ok: true };
}
```

- [ ] **Step 5: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS for `entries.ts` (still expected error in `timeline/page.tsx` until Task 8). `isNotNull` is imported even if only used later — remove it here if unused to satisfy lint, OR skip importing it now and add in Task 7. (Lint is run in Task 13.)

> **Cleanup note:** Only import `isNotNull` if a step uses it. None of Task 6's code uses `isNotNull` — **do not add it in Step 1**. (Corrected: drop the `isNotNull` import from Step 1.)

- [ ] **Step 6: Commit**

```bash
git add ui/app/actions/entries.ts
git commit -m "feat(entries): author on capture + setSecret/giftEntry actions"
```

---

## Task 7: Locked + gift cards

**Files:**
- Create: `ui/app/components/LockedEntryCard.tsx`
- Create: `ui/app/components/GiftCard.tsx`

- [ ] **Step 1: Write `LockedEntryCard.tsx`**

```tsx
import type { LockedStub } from "@/app/lib/visibility";
import { DISPLAY_NAMES } from "@/app/lib/identity";

function fmt(ts: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  const d = ts instanceof Date ? ts : new Date(ts);
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Placeholder for a partner's un-gifted secret. Carries no entry text.
export default function LockedEntryCard({ stub }: { stub: LockedStub }) {
  return (
    <article className="border border-dashed border-dim bg-panel/60 p-3">
      <header className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-accent/50">
        <span>🔒 secret</span>
        <span>{DISPLAY_NAMES[stub.author]}</span>
        <span className="ml-auto tabular-nums text-accent/40">{fmt(stub.createdAt)}</span>
      </header>
      <p className="mt-2 text-sm italic text-dim">— locked —</p>
    </article>
  );
}
```

- [ ] **Step 2: Write `GiftCard.tsx` (tap-to-open, plays tone, remembers opened)**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Entry } from "@/app/lib/db/schema";
import { DISPLAY_NAMES, type Author } from "@/app/lib/identity";
import { playGiftOpen } from "@/app/hooks/useAudio";
import EntryCard from "./EntryCard";

const OPENED_KEY = "als_opened_gifts";

function openedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(OPENED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markOpened(id: string) {
  const s = openedSet();
  s.add(id);
  window.localStorage.setItem(OPENED_KEY, JSON.stringify([...s]));
}

// A gifted secret from the partner. Renders wrapped until opened (per device).
export default function GiftCard({ entry }: { entry: Entry }) {
  const fromName = DISPLAY_NAMES[entry.author as Author];
  const [opened, setOpened] = useState(true); // assume opened to avoid flash; corrected in effect

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpened(openedSet().has(entry.id));
  }, [entry.id]);

  function open() {
    playGiftOpen();
    markOpened(entry.id);
    setOpened(true);
  }

  if (!opened) {
    return (
      <button
        type="button"
        onClick={open}
        className="gift-unwrap w-full border border-accent/70 bg-accent/10 p-4 text-center"
      >
        <div className="text-2xl">🎁</div>
        <div className="mt-1 text-[0.7rem] uppercase tracking-widest text-accent">
          a gift from {fromName} — tap to open
        </div>
      </button>
    );
  }

  return (
    <div className="gift-revealed">
      <div className="mb-1 text-[0.6rem] uppercase tracking-widest text-accent/70">
        🎁 gift from {fromName}
      </div>
      <EntryCard entry={entry} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck (expects `playGiftOpen` missing — added in Task 9)**

Run: `cd ui && npx tsc --noEmit`
Expected: error only on the `playGiftOpen` import (added Task 9) and possibly `timeline/page.tsx`. The card files themselves are otherwise correct. (Proceed; Task 9 resolves the import.)

- [ ] **Step 4: Commit**

```bash
git add ui/app/components/LockedEntryCard.tsx ui/app/components/GiftCard.tsx
git commit -m "feat(ui): locked-secret and gift cards"
```

---

## Task 8: Timeline renders the three card kinds

**Files:**
- Modify: `ui/app/components/TimelineList.tsx`
- Modify: `ui/app/timeline/page.tsx`

- [ ] **Step 1: Update `TimelineList` props + imports + dispatch**

Change the imports and signature:

```tsx
import type { VisibleEntry } from "@/app/lib/visibility";
import EntryCard from "./EntryCard";
import LockedEntryCard from "./LockedEntryCard";
import GiftCard from "./GiftCard";

export default function TimelineList({ entries }: { entries: VisibleEntry[] }) {
```

Update the `untagged` count to look inside full entries only:

```tsx
  const untagged = entries.filter((v) => v.kind === "full" && !v.entry.type).length;
```

Replace the render map (the `entries.map(...)` block near the bottom):

```tsx
            {entries.map((v) =>
              v.kind === "locked" ? (
                <LockedEntryCard key={v.stub.id} stub={v.stub} />
              ) : v.gift ? (
                <GiftCard key={v.entry.id} entry={v.entry} />
              ) : (
                <EntryCard key={v.entry.id} entry={v.entry} />
              ),
            )}
```

Also update the empty check (`entries.length === 0`) — it still works as-is (array length). Leave it.

- [ ] **Step 2: Update `timeline/page.tsx` to pass the viewer**

Read the current file first; then ensure it resolves the viewer and forwards it. The page must (a) `getViewer()`, (b) if null redirect home (the gate lives there), (c) call `listEntries(viewer, ...)`:

```tsx
import { redirect } from "next/navigation";
import { getViewer } from "@/app/lib/identity";
// ...existing imports (listEntries, parseTypeFilter, etc.)...

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ type?: string; category?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/");
  const sp = await searchParams; // Next 16: searchParams is async
  const visible = await listEntries(viewer, {
    type: parseTypeFilter(sp.type),
    category: parseCategoryFilter(sp.category),
  });
  return <TimelineList entries={visible} />;
}
```

> Adapt to the file's existing structure (it may already destructure `searchParams`). The key changes: resolve `viewer`, guard null, pass `viewer` first to `listEntries`, pass `visible` to `TimelineList`. Verify `searchParams`/`parseTypeFilter` usage against the actual file before editing.

- [ ] **Step 3: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS once Task 9 (`playGiftOpen`) is also in. If running before Task 9, the only remaining error is the `playGiftOpen` import in `GiftCard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add ui/app/components/TimelineList.tsx ui/app/timeline/page.tsx
git commit -m "feat(timeline): render full/locked/gift cards per viewer"
```

---

## Task 9: `playGiftOpen` synthesized tone

**Files:**
- Modify: `ui/app/hooks/useAudio.ts`

- [ ] **Step 1: Add `playGiftOpen` after `playClick` (mirrors its structure: respect mute, use `ctx()`)**

```ts
// Warm two-note "reveal" chime for opening a gift. Distinct from the dry
// keypad/click sounds: a soft rising sine pair with a gentle decay.
export function playGiftOpen() {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const notes = [523.25, 783.99]; // C5 -> G5, a friendly rising fifth
    notes.forEach((freq, i) => {
      const t = now + i * 0.12;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.linearRampToValueAtTime(0.0, t + 0.35);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // never let a failed chime break interaction
  }
}
```

- [ ] **Step 2: Expose it from the `useAudio` hook**

In the `useAudio` return, add a memoized callback alongside `keystroke`/`click`:

```ts
  const giftOpen = useCallback(() => playGiftOpen(), []);
```

and add `giftOpen` to the returned object: `return { muted, keystroke, click, giftOpen, toggleMute };`

- [ ] **Step 3: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS across the project now (the `GiftCard` import resolves; `playGiftOpen` is exported).

- [ ] **Step 4: Commit**

```bash
git add ui/app/hooks/useAudio.ts
git commit -m "feat(audio): synthesized gift-open chime"
```

---

## Task 10: Capture secret toggle

**Files:**
- Modify: `ui/app/components/CaptureScreen.tsx`

- [ ] **Step 1: Add secret state + toggle, pass to `createEntry`**

Add state near the other hooks:

```tsx
  const [secret, setSecret] = useState(false);
```

Pass it in `submit`:

```tsx
      const res = await createEntry({ text, isSecret: secret });
```

Add a toggle in the header row (the `<div>` with "new entry"), so it reads:

```tsx
        <div className="flex items-center justify-between gap-2 text-[0.7rem] uppercase tracking-widest text-accent/70">
          <span className="flex items-center gap-2"><span className="blink">▌</span><span>new entry</span></span>
          <button
            type="button"
            onClick={() => setSecret((s) => !s)}
            aria-pressed={secret}
            className={`border px-2 py-0.5 tracking-widest ${
              secret ? "border-accent bg-accent text-black" : "border-dim text-accent/60"
            }`}
          >
            {secret ? "🔒 secret" : "🔓 open"}
          </button>
        </div>
```

After a successful submit, reset the toggle (alongside `setText("")`):

```tsx
        setSecret(false);
```

- [ ] **Step 2: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add ui/app/components/CaptureScreen.tsx
git commit -m "feat(capture): secret toggle on new entries"
```

---

## Task 11: EntryCard — own-secret marker, lock toggle, gift control

Only your OWN entries get these controls. The card is reused for gifts (Task 7) and own entries; partner non-secret entries also render here but must NOT show lock/gift controls. We pass an explicit `owner` flag from the timeline.

**Files:**
- Modify: `ui/app/components/EntryCard.tsx`
- Modify: `ui/app/components/TimelineList.tsx` (pass `owner`)
- Modify: `ui/app/components/GiftCard.tsx` (pass `owner={false}`)

- [ ] **Step 1: Extend `EntryCard` props + imports**

```tsx
import { setSecret as setSecretAction, giftEntry, setEntryType, deleteEntry } from "@/app/actions/entries";
```

Change the signature:

```tsx
export default function EntryCard({ entry, owner = false }: { entry: Entry; owner?: boolean }) {
```

- [ ] **Step 2: Add secret/gift handlers (inside the component)**

```tsx
  function toggleSecret() {
    startTransition(async () => {
      await setSecretAction({ id: entry.id, isSecret: !entry.isSecret });
      router.refresh();
    });
  }
  function gift() {
    startTransition(async () => {
      await giftEntry({ id: entry.id });
      router.refresh();
    });
  }
```

- [ ] **Step 3: Add the controls in the footer action row (only when `owner`)**

Inside the bottom `<div className="mt-2.5 flex items-center justify-between">`, before the delete button, insert an owner-only cluster:

```tsx
          {owner && (
            <span className="flex items-center gap-2 text-[0.6rem] uppercase tracking-widest">
              <button
                type="button"
                disabled={pending}
                onClick={toggleSecret}
                className="min-h-[36px] px-2 text-accent/60 active:text-accent disabled:opacity-40"
              >
                {entry.isSecret ? "🔒 secret" : "🔓 make secret"}
              </button>
              {entry.isSecret && entry.giftedAt == null && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={gift}
                  className="min-h-[36px] border border-accent/60 px-2 text-accent active:bg-accent active:text-black disabled:opacity-40"
                >
                  🎁 offer as gift
                </button>
              )}
              {entry.isSecret && entry.giftedAt != null && (
                <span className="text-accent/50">🎁 gifted</span>
              )}
            </span>
          )}
```

- [ ] **Step 4: Pass `owner` from `TimelineList`**

In the dispatch map (Task 8), the full-entry branch needs to know ownership. Since `listEntries` already redacts, a `full` entry is the viewer's own when `v.entry.author === viewer`. Thread `viewer` into `TimelineList`:

Update signature: `export default function TimelineList({ entries, viewer }: { entries: VisibleEntry[]; viewer: Author })` (import `Author` from identity). In `timeline/page.tsx` pass `viewer={viewer}`. Then the non-gift full branch becomes:

```tsx
              ) : v.gift ? (
                <GiftCard key={v.entry.id} entry={v.entry} />
              ) : (
                <EntryCard key={v.entry.id} entry={v.entry} owner={v.entry.author === viewer} />
              ),
```

- [ ] **Step 5: `GiftCard` renders a partner's entry — pass `owner={false}`**

In `GiftCard.tsx` the `<EntryCard entry={entry} />` becomes `<EntryCard entry={entry} owner={false} />` (a gift is always the partner's, never lockable by the viewer).

- [ ] **Step 6: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS. Confirm `Author` is imported in `TimelineList.tsx` and `timeline/page.tsx` passes `viewer`.

- [ ] **Step 7: Commit**

```bash
git add ui/app/components/EntryCard.tsx ui/app/components/TimelineList.tsx ui/app/components/GiftCard.tsx
git commit -m "feat(entrycard): owner-only secret toggle + gift control"
```

---

## Task 12: Identity gate + switch affordance on home

**Files:**
- Create: `ui/app/components/IdentityGate.tsx`
- Create: `ui/app/components/SwitchIdentity.tsx`
- Modify: `ui/app/page.tsx`
- Modify: `ui/app/components/StatusBar.tsx` (gift nudge — verify file first)

- [ ] **Step 1: Write `IdentityGate.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewer } from "@/app/actions/identity";
import { AUTHORS, DISPLAY_NAMES } from "@/app/lib/identity";
import Screen from "./Screen";

export default function IdentityGate() {
  const [pending, start] = useTransition();
  const router = useRouter();
  function pick(a: string) {
    start(async () => {
      await setViewer(a);
      router.refresh();
    });
  }
  return (
    <Screen title="IDENTITY">
      <section className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-[0.7rem] uppercase tracking-widest text-accent/70">who is using this device?</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {AUTHORS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={pending}
              onClick={() => pick(a)}
              className="min-h-[52px] border border-accent bg-accent/10 text-sm uppercase tracking-widest text-accent active:bg-accent active:text-black disabled:opacity-40"
            >
              I am {DISPLAY_NAMES[a]}
            </button>
          ))}
        </div>
      </section>
    </Screen>
  );
}
```

- [ ] **Step 2: Write `SwitchIdentity.tsx` (small corner control for the menu)**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewer } from "@/app/actions/identity";
import { DISPLAY_NAMES, partnerOf, type Author } from "@/app/lib/identity";

export default function SwitchIdentity({ viewer }: { viewer: Author }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const other = partnerOf(viewer);
  function swap() {
    start(async () => {
      await setViewer(other);
      router.refresh();
    });
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={swap}
      title="switch identity"
      className="absolute right-2 top-2 z-10 border border-dim px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-accent/60 active:bg-accent/20 disabled:opacity-40"
    >
      {DISPLAY_NAMES[viewer]} ⇄
    </button>
  );
}
```

- [ ] **Step 3: Update `app/page.tsx` to gate on viewer**

Read the current `page.tsx` first. It currently renders `HomeMenu`. Make it:

```tsx
import { getViewer } from "@/app/lib/identity";
import HomeMenu from "@/app/components/HomeMenu";
import IdentityGate from "@/app/components/IdentityGate";
import SwitchIdentity from "@/app/components/SwitchIdentity";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) return <IdentityGate />;
  return (
    <div className="relative h-full">
      <SwitchIdentity viewer={viewer} />
      <HomeMenu />
    </div>
  );
}
```

> If `page.tsx` already does `verifySession()` or has other content, preserve it — only add the viewer gate. Verify against the real file. Auth still happens via proxy/DAL; the gate is purely identity.

- [ ] **Step 4: Gift-waiting nudge — read `StatusBar.tsx` first**

Run (read): inspect `ui/app/components/StatusBar.tsx`. The nudge requires knowing whether the viewer has ≥1 unopened gift, which depends on `localStorage` (client) AND which entries are gifts (server). Keep it simple and client-scoped:

- If `StatusBar` is a client component, add an optional `giftWaiting?: boolean` prop and render "🎁 a gift is waiting" when true.
- Computing `giftWaiting` precisely (unopened ∩ gifted-to-me) needs the gift list + localStorage. **Scope decision:** implement the nudge as a small client component `GiftNudge.tsx` that the timeline already has the data for, OR defer. To avoid a half-wired prop, implement `GiftNudge` inside the timeline in this step:

Create `ui/app/components/GiftNudge.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const OPENED_KEY = "als_opened_gifts";

// giftIds = ids of gifts currently visible to the viewer (gifted partner secrets).
export default function GiftNudge({ giftIds }: { giftIds: string[] }) {
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    let opened = new Set<string>();
    try {
      opened = new Set(JSON.parse(window.localStorage.getItem(OPENED_KEY) || "[]"));
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWaiting(giftIds.filter((id) => !opened.has(id)).length);
  }, [giftIds]);
  if (waiting < 1) return null;
  return (
    <div className="border border-accent bg-accent/10 px-3 py-2 text-center text-[0.7rem] uppercase tracking-widest text-accent">
      🎁 {waiting} gift{waiting > 1 ? "s" : ""} waiting — open in the timeline
    </div>
  );
}
```

Render it at the top of `TimelineList` body (above the classify button), computing `giftIds` from props:

```tsx
  const giftIds = entries.filter((v) => v.kind === "full" && v.gift).map((v) => (v as { entry: { id: string } }).entry.id);
```

```tsx
        <GiftNudge giftIds={giftIds} />
```

(Import `GiftNudge` at the top of `TimelineList.tsx`.) Leave `StatusBar.tsx` unchanged — the nudge lives in the timeline where the data already is. **This supersedes the spec's "status-bar" placement** for simplicity; functionally identical (a visible "gift waiting" cue once identity + timeline load).

- [ ] **Step 5: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ui/app/components/IdentityGate.tsx ui/app/components/SwitchIdentity.tsx ui/app/components/GiftNudge.tsx ui/app/page.tsx ui/app/components/TimelineList.tsx
git commit -m "feat(identity): home gate + switch affordance + gift-waiting nudge"
```

---

## Task 13: AI Ask — target selector + viewer/secret-safe retrieval

**Files:**
- Modify: `ui/app/lib/retrieval.ts`
- Modify: `ui/app/api/ask/route.ts`
- Modify: `ui/app/lib/prompt.ts`
- Modify: `ui/app/components/AskPanel.tsx`

- [ ] **Step 1: Add viewer/target visibility filter to `buildContext`**

In `retrieval.ts`, add imports:

```ts
import { isNull, ne } from "drizzle-orm";
import { type Author } from "@/app/lib/identity";
```

Change the signature and add the filter (the secret filter is ALWAYS applied; the target filter is conditional):

```ts
export type AskTarget = Author | "both";

export async function buildContext(
  query: string,
  opts: { viewer: Author; target: AskTarget },
): Promise<RetrievedContext> {
  const since = detectSince(query);
  const type = detectType(query);
  const category = detectCategory(query);
  const kws = keywords(query);

  const conds: SQL[] = [];
  if (since) conds.push(gte(entries.createdAt, since));
  if (type) conds.push(eq(entries.type, type));
  if (category) conds.push(eq(entries.category, category));

  // TARGET filter: a specific person -> only their entries. "both" -> no author
  // constraint (legacy null-author entries are included only in "both").
  if (opts.target !== "both") {
    conds.push(eq(entries.author, opts.target));
  }

  // SECRET filter (ALWAYS): the model may only see an entry that is not a
  // locked partner-secret from the viewer's perspective:
  //   is_secret = false  OR  author = viewer  OR  gifted_at IS NOT NULL
  const secretOk = or(
    eq(entries.isSecret, false),
    eq(entries.author, opts.viewer),
    isNotNull(entries.giftedAt),
  );
  if (secretOk) conds.push(secretOk);
```

(The rest of `buildContext` — keyword OR, query, fallback, return — is unchanged, EXCEPT the fallback's `structural[]` must also include the same target + secret conditions. Add them to the fallback block:)

```ts
  if (rows.length === 0) {
    const structural: SQL[] = [];
    if (since) structural.push(gte(entries.createdAt, since));
    if (type) structural.push(eq(entries.type, type));
    if (category) structural.push(eq(entries.category, category));
    if (opts.target !== "both") structural.push(eq(entries.author, opts.target));
    const s2 = or(
      eq(entries.isSecret, false),
      eq(entries.author, opts.viewer),
      isNotNull(entries.giftedAt),
    );
    if (s2) structural.push(s2);
    rows = await db
      .select()
      .from(entries)
      .where(structural.length ? and(...structural) : undefined)
      .orderBy(desc(entries.createdAt))
      .limit(MAX_ENTRIES);
  }
```

Add `isNotNull` to the `drizzle-orm` import line (and remove the unused `isNull`/`ne` if you didn't use them — only import what's used; `isNotNull` IS used, `isNull`/`ne` are NOT — do not import them).

> **Correction:** Step 1's first import line is wrong — do **not** import `isNull, ne`. Import only what's used: add `isNotNull` to the existing `drizzle-orm` import in `retrieval.ts`, and import `type Author` from identity.

- [ ] **Step 2: Update the Ask route to read viewer + accept target**

In `route.ts`:

```ts
import { getViewer } from "@/app/lib/identity";
import { AUTHORS } from "@/app/lib/identity";
```

Extend the body schema and pass through:

```ts
const BodySchema = z.object({
  query: z.string().trim().min(1),
  target: z.enum(["author_a", "author_b", "both"]).optional(),
});
```

After the existing `getSession()` 401 check, resolve viewer:

```ts
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "no identity" }, { status: 409 });
  }
```

Change the context call:

```ts
  const { entries } = await buildContext(parsed.data.query, {
    viewer,
    target: parsed.data.target ?? "both",
  });
```

And make the system prompt target-aware:

```ts
  const upstream = await streamChat([
    { role: "system", content: SYSTEM_PROMPT + targetClause(parsed.data.target ?? "both") },
    { role: "user", content: buildUserMessage(parsed.data.query, serialized) },
  ]);
```

- [ ] **Step 3: Add `targetClause` to `prompt.ts`**

```ts
import { DISPLAY_NAMES } from "@/app/lib/identity";
import type { Author } from "@/app/lib/identity";

// Appended to SYSTEM_PROMPT so the model uses people's names and knows scope.
export function targetClause(target: Author | "both"): string {
  if (target === "both") {
    return `\n\nThis log belongs to two people: ${DISPLAY_NAMES.author_a} and ${DISPLAY_NAMES.author_b}. Refer to them by name when relevant.`;
  }
  return `\n\nFocus this answer on ${DISPLAY_NAMES[target]}. Refer to them by name.`;
}
```

> Note: `prompt.ts` has `"server-only"` at the top; importing from `identity.ts` (also server-only) is fine — the Ask route is a Node runtime handler.

- [ ] **Step 4: Add the target selector to `AskPanel.tsx`**

Add state:

```tsx
  const [target, setTarget] = useState<"author_a" | "author_b" | "both">("both");
```

Send it in the fetch body:

```tsx
        body: JSON.stringify({ query, target }),
```

Add a 3-way toggle above the textarea (uses display names — hardcode here OR import; client component can import the constants since they're plain values, but `identity.ts` is `server-only`. **So define a tiny client-safe name map in AskPanel**):

```tsx
  const NAMES = { author_a: "Moazzam", author_b: "Nuha", both: "Both" } as const;
```

```tsx
        <div className="flex gap-1.5">
          {(["author_a", "author_b", "both"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              aria-pressed={target === t}
              className={`min-h-[32px] flex-1 border px-2 text-[0.6rem] uppercase tracking-widest ${
                target === t ? "border-accent bg-accent text-black" : "border-dim text-accent/60"
              }`}
            >
              {NAMES[t]}
            </button>
          ))}
        </div>
```

Also handle the new 409 status:

```tsx
        setStatus(res.status === 401 ? "SESSION EXPIRED" : res.status === 409 ? "SET IDENTITY FIRST" : "QUERY FAILED");
```

> **Why a separate `NAMES` in AskPanel:** `identity.ts` is `"server-only"` and cannot be imported into a client component. The display names are duplicated here as a small client-safe constant. If this duplication bothers you, a follow-up could split names into a non-server module — out of scope here.

- [ ] **Step 5: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ui/app/lib/retrieval.ts ui/app/api/ask/route.ts ui/app/lib/prompt.ts ui/app/components/AskPanel.tsx
git commit -m "feat(ask): author-target selector + secret-safe retrieval"
```

---

## Task 14: Full verification — lint, build, manual smoke

**Files:** none (verification only).

- [ ] **Step 1: Lint the whole project**

Run: `cd ui && npm run lint`
Expected: no errors. Fix any unused imports (esp. the `isNotNull`/`isNull` cautions noted in Tasks 6 & 13) or `react-hooks` warnings. The `eslint-disable-next-line react-hooks/set-state-in-effect` comments are already placed where needed.

- [ ] **Step 2: Typecheck (final)**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS, zero errors.

- [ ] **Step 3: Production build**

Run: `cd ui && npm run build`
Expected: build succeeds, emits `.next/standalone`. (DB env must be present.)

- [ ] **Step 4: Manual smoke (dev server + two browser profiles)**

Run: `cd ui && npm run dev` (DB up, `ui/.env` set). Then verify each:

1. **Deploy-mid-session:** with an existing `als_session` cookie but no `als_author`, load `/` → see **IDENTITY** screen (NOT re-login). Pick "I am Moazzam".
2. **Attribution:** create an entry → appears in timeline as a normal card with owner controls.
3. **Secret at capture:** toggle 🔒, create → in a second browser profile, pick "I am Nuha", open `/timeline` → that entry shows as **🔒 secret / Moazzam / — locked —**, and the page source / network response contains **no** secret text.
4. **Make secret after the fact:** on Moazzam's own open entry, "🔓 make secret" → Nuha's timeline now locks it.
5. **Gift:** on Moazzam's secret entry, "🎁 offer as gift" → Nuha's timeline shows a wrapped 🎁 card + the "gift waiting" nudge. Tap to open → hear the chime, card unwraps to full text tagged "🎁 gift from Moazzam". Reload → it stays open (no re-unwrap).
6. **Switch identity:** on home, the corner "Moazzam ⇄" swaps to Nuha and back.
7. **AI scoping:** on `/ask`, set target = **Nuha**, ask "what's holding her back?" → answer references Nuha by name and does not reveal any of Nuha's un-gifted secrets. Set target = **Moazzam** asking about yourself includes your own secrets.

- [ ] **Step 5: Final commit (only if smoke required tweaks)**

```bash
git add -A
git commit -m "fix: couple's mode smoke-test adjustments"
```

(If smoke passed clean, no commit needed.)

---

## Self-Review notes (already folded into the tasks)

- **Spec coverage:** §1 data model → Task 3; §1 visibility rule → Task 4; §2 identity → Tasks 1,2,12; §3 capture/secret → Tasks 6,10,11; §4 reads/locked cards → Tasks 5,7,8; §5 gifting/reveal → Tasks 6,7,9,11,12; §6 audio → Task 9; §7 AI scoping → Task 13. All sections mapped.
- **Stale-spec corrections made explicit:** audio is synthesized (`playGiftOpen`), not an asset file (Task 9); gift-waiting nudge lives in the timeline (`GiftNudge`) rather than `StatusBar`, since that's where the data is (Task 12) — functionally identical to the spec.
- **No-test-framework reality:** verification is typecheck + lint + build + a throwaway pure-logic check for the one security-critical function (Task 4) + scripted manual smoke (Task 14). Adding a permanent test runner is out of scope.
- **Type consistency:** `Author`, `VisibleEntry`/`LockedStub`, `entryVisibility`, `setSecret`/`giftEntry`/`setViewer`, `targetClause`, `playGiftOpen` are defined once and reused with matching signatures.
- **Import hygiene flagged:** Tasks 6 & 13 explicitly correct against importing unused `drizzle-orm` helpers; only `isNotNull` is actually used (Task 13).
- **Client/server boundary:** `identity.ts` is `server-only`; `AskPanel` (client) uses a small local name map instead — called out in Task 13.
