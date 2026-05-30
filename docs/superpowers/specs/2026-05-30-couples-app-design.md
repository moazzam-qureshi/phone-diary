# Design — Couple's Mode (two authors, secrets, gifts)

**Date:** 2026-05-30
**Status:** Implemented. **Auth model revised post-implementation** — see the
"AUTH REVISION" note below; the honor-system identity cookie was replaced by
per-person passcodes because a single shared password let either person pick the
other's identity and read their secrets.

---

## ⚠️ AUTH REVISION (supersedes Sections 2 identity decisions)

The original design kept the single shared password and made identity an
honor-system `als_author` cookie ("we each have our own phone"). In practice the
shared password meant anyone could log in on any device, pick the other person,
and read their secrets — defeating the secret feature. **Revised model:**

- **Per-person passcodes** stored in a new `users` table (`author` PK,
  `passcode_hash`). The passcode both authenticates AND proves identity.
- **Login** = enter your passcode → the matching `users` row identifies you →
  `author` is embedded in the **signed session JWT** (`{ sub:"owner", author }`),
  so identity is tamper-proof.
- **First-run setup:** each person claims their slot ("I am Moazzam/Nuha" → set a
  passcode). If only one slot is claimed, that person can log in and a
  "set up <other>" affordance lets the partner claim theirs later.
- **Removed:** `als_author` cookie, `IdentityGate`, `SwitchIdentity`,
  `setViewer`, and the single `APP_PASSWORD_HASH` login path. `getViewer()` now
  reads the author from the session, not a cookie. There is no identity switch —
  you log out and log in as the other person (needs their passcode).
- This is what makes the secret/gift feature actually private.

Everything else below (secrets, gifts, AI scoping, visibility rule) is unchanged
and still accurate.

## Goal

Turn phone-diary from a single-user log into a two-person ("couple's")
app for Moazzam and Nuha, **without** changing the existing shared-password
auth. Three capabilities:

1. **Attribution** — every entry is tagged with who wrote it.
2. **Secrets** — either person can mark an entry private; the partner sees a
   locked placeholder, never the text.
3. **Gifts** — the author can "offer as a present": reveal one of their own
   secret entries to the partner, permanently, with a celebrated open moment.

Plus: the AI Ask screen can scope a question to one person or both.

## Decisions (from brainstorming)

- **Identity model: Approach A — identity cookie, honor system.** The shared
  app password is kept exactly as-is. After login, each phone picks "who am I"
  once; it's remembered in a separate cookie. No per-person passwords, no PINs.
  Justified by "we each have our own phone" + zero-friction ethos. Identity is
  deliberately decoupled from auth.
- **Secret model: visible-but-locked.** Partner sees a `🔒 SECRET` placeholder
  card (timestamp + author only), not the text.
- **Gift model: permanent + celebrated.** No takebacks. Tap-to-open with a
  special tone + unwrap animation; "🎁 gift from <name>" tag afterward.
- **AI scoping: author selector on Ask** (Moazzam / Nuha / Both).
- **Names are constants, not env vars** — app content, not deployment config.
- **Legacy entries (`author = null`): visible to both, never lockable.** They
  predate secrets and have no provable author.

## Non-goals

- No real per-account auth / users table / per-user password hashes.
- No push-notification infrastructure (single self-hosted app).
- No tamper-proof identity (honor system is intentional; trusted partners,
  own devices).
- No "ungift"/revoke (a present is permanent; un-secreting it entirely is a
  separate, deliberate "go fully public" action).

---

## Section 1 — Data model

Three new columns on the `entries` table (one Drizzle migration). A new
`author` pgEnum, mirroring the existing `entryType` / `entryCategory` pattern,
with **stable internal values** `author_a` / `author_b` (rename-proof — display
names are separate constants).

| Column      | Type                              | Default | Meaning |
|-------------|-----------------------------------|---------|---------|
| `author`    | `author` enum (`author_a`\|`author_b`) | `null`  | Who wrote it. `null` = legacy (pre-feature). |
| `is_secret` | boolean                           | `false` | If true, partner sees a locked placeholder. |
| `gifted_at` | timestamp (tz)                    | `null`  | Non-null = author revealed this secret to partner (powers gift state + reveal). |

### Visibility rule (core invariant) — evaluated server-side per viewer

Given a `viewer` (the current identity) and an entry:

- `author === viewer` → **full** (own entries always visible, incl. own secrets).
- `author === null` (legacy) → **full** to both (and never lockable).
- partner's entry, `is_secret === false` → **full**.
- partner's entry, `is_secret === true`, `gifted_at` null → **locked** (no text
  leaves the server).
- partner's entry, `is_secret === true`, `gifted_at` set → **full**, tagged
  "🎁 gift from <name>".

---

## Section 2 — Identity (Approach A)

- **Cookie:** `als_author` holds `author_a` | `author_b`. Plain (non-JWT)
  cookie — honor system, no need to sign a preference. Separate from
  `als_session`; **auth is untouched** (`session.ts`, `dal.ts` unchanged).
- **New module `app/lib/identity.ts`** (`"server-only"`), single source of truth:
  - `type Author = "author_a" | "author_b"`
  - `getViewer(): Promise<Author | null>` — reads `als_author`; `null` = not chosen.
  - `requireViewer(): Promise<Author>` — for write paths once identity is expected.
  - `DISPLAY_NAMES: Record<Author, string> = { author_a: "Moazzam", author_b: "Nuha" }`
    — **constants**, not env. One edit to rename; no migration.
  - `partnerOf(author: Author): Author`.
- **Set action:** `setViewer(author)` in `app/actions/identity.ts` — validate
  against the two enum values, set `als_author` cookie, `revalidatePath('/')`.
- **"Who am I" gate:** after shared-password login, if `als_author` is unset,
  the home screen renders a one-time **IDENTITY** pick screen
  ("I am Moazzam" / "I am Nuha") instead of the menu. A small "switch identity"
  affordance lives in a corner for recovery from a mis-tap.
- **Deploy-safety:** already-logged-in users (valid `als_session`, no
  `als_author`) are NOT re-prompted to log in — `getViewer()` returns `null`,
  so they land on the pick screen on next load. This is the payoff of decoupling
  identity from auth.
- `env.ts` is **not** modified.

---

## Section 3 — Capture & marking secrets

- **Author on write:** `createEntry` (`app/actions/entries.ts`) calls
  `requireViewer()` and writes `author` on insert. If identity is unset it
  returns `"SET IDENTITY FIRST"` (unreachable in normal flow, but no `null`-
  author row can be created mid-deploy). Auto-classification unchanged.
- **Secret at capture time:** `CaptureScreen.tsx` gets a single `🔒 SECRET`
  toggle near the LOG action, off by default. Input becomes
  `{ text: string; isSecret?: boolean }`; Zod schema gains
  `isSecret: z.boolean().optional()`.
- **Secret after the fact:** on `EntryCard`, for **your own** entries, a lock
  control toggles secrecy. New action `setSecret({ id, isSecret })`:
  - `requireViewer()`, validate UUID.
  - **Ownership check:** load entry; reject if `entry.author !== viewer`.
  - Un-secreting an entry clears `gifted_at` too (no longer secret → gift state
    is moot; this is "going fully public").
  - `revalidatePath('/timeline')`.
- **Audio:** marking secret gets no tone; the celebrated moment is the *open*
  (Section 5/6).

---

## Section 4 — Reads, timeline & locked cards

- **Enforcement in the data layer**, not components — `app/lib/entries.ts`
  applies the Section 1 rule so no caller can leak text.
- `listEntries(viewer, filters)` (and `entryLabelMap`) return **`VisibleEntry[]`**:
  - a **full entry** (own / partner non-secret / gifted / legacy), or
  - a **redacted stub** `{ id, createdAt, author, locked: true }` — **no `text`,
    no `outcome`, no classification**. Secret content never enters the payload
    sent to the browser for a locked card. (Key safety property.)
- **`LockedEntryCard.tsx`** renders the stub: `🔒 SECRET`, timestamp +
  "<partner name> · locked", terminal-styled (dim mono). `TimelineList.tsx`
  picks `LockedEntryCard` for stubs, `EntryCard` for full entries.
- **Own secrets (your view):** normal card with a small `🔒` marker + the gift
  affordance.
- **Gifted (partner view):** full card tagged `🎁 gift from <name>` (open
  behavior in Section 5).

---

## Section 5 — Gifting & celebrated reveal

- **Give:** on your own *secret* entry's `EntryCard`, a `🎁 OFFER AS GIFT`
  control. New action `giftEntry({ id })`:
  - `requireViewer()`, validate UUID.
  - **Ownership + secrecy check:** require `entry.author === viewer` AND
    `entry.is_secret === true`.
  - Set `gifted_at = now()`; entry stays `is_secret = true` (so it reads as a
    *revealed secret*). Per Section 1 this flips it visible-to-partner.
  - `revalidatePath('/timeline')`. **Permanent — no ungift action.**
- **Celebrated reveal (partner side):**
  - Newly-visible gift renders as a wrapped present (`🎁 a gift from <name>`),
    **tap to open**.
  - On open: `gift-open` tone (Section 6) + brief unwrap animation, then settles
    into a normal card tagged `🎁 gift from <name>`.
- **"Already opened" tracking:** client-side `localStorage` set of opened gift
  IDs, per phone (correct scope — "have I opened this on this device"). No DB
  column, no server round-trip. Opened → renders revealed; unopened → wrapped.
- **Waiting-gift nudge:** when the partner has ≥1 unopened gift, a small
  status-bar message ("🎁 a gift is waiting"). No push infrastructure.

---

## Section 6 — Audio

- Reuses `app/hooks/useAudio.ts` and the existing global mute toggle.
- **One new event: `gift-open`** — warmer, slightly longer tone, distinct from
  the capture confirm beep. Played once on unwrap.
- Marking secret has no tone. If muted, the unwrap is silent but still animates.
- Wire `gift-open` into the hook's sound map following the existing event
  pattern; add one short audio asset consistent with the others.

---

## Section 7 — AI Ask scoping

- **Selector:** `AskPanel.tsx` gains a Moazzam / Nuha / Both toggle, defaulting
  to the current viewer. Sent in the POST body as
  `target: "author_a" | "author_b" | "both"`.
- **Route (`app/api/ask/route.ts`):** `BodySchema` gains optional `target`
  (default `both`). Read viewer via `getViewer()` (already reads the session
  cookie for auth). Pass `{ viewer, target }` into `buildContext`.
- **Retrieval (`app/lib/retrieval.ts`) — privacy-critical.**
  `buildContext(query, { viewer, target })` adds, on top of existing heuristics:
  - **Target filter:** `both` → no author constraint; else `author = target`.
    Legacy (`author = null`) entries included only when `target = both`.
  - **Secret filter (always, independent of target):** eligible only if
    `is_secret = false` OR `author = viewer` OR `gifted_at IS NOT NULL`. Mirrors
    the Section 1 rule in SQL. The model never receives locked secret text.
- **System prompt:** tell the model which person(s) are targeted and to use
  display names (from `identity.ts` constants), so answers read "Nuha tends
  to…" not "author_b tends to…".

---

## Files touched (summary)

**New:**
- `app/lib/identity.ts`
- `app/actions/identity.ts`
- `app/components/LockedEntryCard.tsx`
- identity pick screen component (e.g. `app/components/IdentityGate.tsx`)
- one Drizzle migration (`ui/drizzle/`)
- one `gift-open` audio asset

**Modified:**
- `app/lib/db/schema.ts` (author enum + 3 columns)
- `app/lib/entries.ts` (`VisibleEntry`, viewer-aware reads + redaction)
- `app/lib/retrieval.ts` (viewer/target visibility filter)
- `app/actions/entries.ts` (`createEntry` author + isSecret; `setSecret`;
  `giftEntry`)
- `app/api/ask/route.ts` (target in body, viewer read)
- `app/lib/prompt.ts` (target-aware system prompt + display names)
- `app/components/CaptureScreen.tsx` (secret toggle)
- `app/components/EntryCard.tsx` (own-secret marker, lock toggle, gift control,
  gift-from tag, unwrap)
- `app/components/TimelineList.tsx` (stub vs full dispatch)
- `app/components/AskPanel.tsx` (target selector)
- `app/hooks/useAudio.ts` (`gift-open` event)
- home screen / page that decides menu-vs-identity-gate

**Not touched (intentionally):** `app/lib/session.ts`, `app/lib/dal.ts`,
`app/lib/env.ts`.
