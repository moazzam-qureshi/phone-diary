# Design — Partner Reactions (emoji + note, floating on app open)

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — ready for implementation plan

## Goal

Let each partner react to the other's diary entries with an emoji (from a small
cosy set) plus an optional one-line note. When the entry's author next opens the
app, new reactions float in as cosy toast notifications (with a soft chime), then
persist on the entry card. Surfaces on app open / navigation — no push infra.

## Decisions (from brainstorming)

- **Reaction = one emoji + optional one-line note**, per (entry, reactor). One
  reaction per person per entry; reacting again **updates** it (changes
  emoji/note); re-tapping the active emoji **removes** it.
- **Cosy fixed emoji set** (no full picker): `❤️ 😊 😢 🔥 👏 🤗 🌱` — a constant,
  display-only, easy to edit.
- **React only to entries you can see** — partner's normal entries + secrets they
  gifted you. Never a locked secret. Never your own entries.
- **Notification = floating toast on app open**, then the reaction **persists on
  the entry card** for both people.
- **Seen-state is server-side** (`seen_at` column) so a reaction floats once
  across all the author's devices.
- **Freshness:** on app open / navigation only (Server Components re-run); no
  background polling / websockets.
- **Sound:** a soft `reaction-pop` chime when a toast floats in (distinct from
  gift-open), respecting the existing mute. Sending a reaction is silent.

## Non-goals

- No threaded comments / multi-message replies (one note line max).
- No multiple stacked emojis per person per entry.
- No reacting to locked secrets; no reacting to your own entries.
- No push notifications, no websockets, no live polling.
- No reaction analytics.

---

## Section 1 — Data model

New `reactions` table (one Drizzle migration):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK default random | |
| `entry_id` | uuid → `entries.id` ON DELETE CASCADE | reacted-to entry |
| `author` | `author` enum (reuse existing) | **who reacted** |
| `emoji` | text NOT NULL | one of the cosy set |
| `note` | text, nullable | optional one-line reply |
| `created_at` | timestamptz NOT NULL default now | |
| `seen_at` | timestamptz, nullable | null = author not yet shown the float |

- **Unique index on `(entry_id, author)`** — one reaction per person per entry;
  upsert on conflict.
- Index on `entry_id` for batch fetch.
- Cosy emoji set as a constant in `app/lib/reactions-shared.ts` (client-safe),
  e.g. `export const REACTION_EMOJIS = ["❤️","😊","😢","🔥","👏","🤗","🌱"]`.
- `type Reaction = typeof reactions.$inferSelect`.

## Section 2 — Visibility & who-can-react rules

- **Can react** to an entry only if `entryVisibility(entry, viewer).kind ===
  "full"` AND `entry.author !== viewer` (partner's visible entries only — never
  a locked secret, never your own).
- The **react control** renders only on partner cards that are visible.
- **Both people see** the persisted reaction (emoji + note + reactor name) on the
  card; it is not secret between the two of them.
- No reaction can exist on a locked entry (you can't react to one), so no
  reaction text ever reaches the client for hidden content.

## Section 3 — Server actions + reads

**`app/actions/reactions.ts`** (`"use server"`):
- `setReaction({ entryId, emoji, note? })` — `requireViewer()`; validate
  `emoji ∈ REACTION_EMOJIS`, `note` trimmed ≤ 120 chars (optional); load target
  entry, require `entryVisibility(entry, viewer).kind === "full"` AND
  `entry.author !== viewer`; **upsert** on `(entry_id, author)` setting
  emoji/note and `seen_at = null` (a change re-announces). `revalidatePath("/timeline")`.
- `removeReaction({ entryId })` — `requireViewer()`; delete the viewer's reaction
  on that entry. `revalidatePath("/timeline")`.
- `markReactionsSeen({ ids })` — `requireViewer()`; set `seen_at = now()` for
  those reaction ids **whose entry is authored by the viewer** (ownership-checked
  via join/subquery, so you can only mark floats on your own entries).

**`app/lib/reactions.ts`** (`"server-only"`):
- `reactionsForEntries(entryIds: string[]): Promise<Map<string, Reaction[]>>` —
  batch fetch, attached to cards by the timeline query.
- `unseenReactionsForViewer(viewer): Promise<ReactionToast[]>` — reactions on the
  viewer's OWN entries with `seen_at IS NULL`, joined to a short entry snippet +
  reactor name for the toast.

All server-only; visibility/ownership enforced in the action layer (mirrors
`setSecret`/`giftEntry`).

## Section 4 — UI

- **React control (`EntryCard`)** — for a visible partner entry (`!owner`): a
  small "react" affordance that opens the cosy emoji row + an optional one-line
  note input. Picking an emoji → `setReaction`; re-tapping the active one →
  `removeReaction`.
- **Reaction display** — a small footer row on every card showing each reaction
  as `<emoji> "<note>" — <reactorName>` (note omitted if empty). Read-only on
  your own entries; at most two (one per person).
- **`ReactionToasts` (client)** — mounted in the home/timeline area; receives
  `unseenReactionsForViewer` from the server. On mount, animates them in as
  frosted-glass floating cards (emoji + note + entry snippet), plays
  `playReactionPop()` (mute-aware), then calls `markReactionsSeen({ ids })` so
  they never float again. Auto-dismiss after a few seconds; tap to dismiss.
- **Sound** — `playReactionPop()` added to `useAudio.ts` (gentle, distinct from
  `playGiftOpen`); respects the existing mute flag.
- Styling: frosted-glass + Caveat/Quicksand, consistent with the cosy theme.

## Section 5 — Error handling & scope guardrails

- Invalid emoji / over-long note / non-visible or own entry → action returns
  `{ ok: false }` and the UI shows a brief inline error; no throw to the user.
- `markReactionsSeen` failing is non-fatal (the toast still dismisses; it just
  may float again next open — acceptable).
- Deleting an entry cascades its reactions (FK ON DELETE CASCADE).
- **No changes** to auth, secrets/gift logic, AI, or filters beyond attaching
  reactions to the timeline read. Verification: typecheck + lint + build +
  manual smoke (no test framework in repo).

---

## Files (summary)

**New:**
- `ui/app/lib/reactions-shared.ts` (client-safe emoji set + types)
- `ui/app/lib/reactions.ts` (server reads)
- `ui/app/actions/reactions.ts` (server actions)
- `ui/app/components/ReactionToasts.tsx` (floating notifications)
- `ui/app/components/ReactionBar.tsx` (emoji row + note input, used by EntryCard)
- one Drizzle migration (reactions table)

**Modified:**
- `ui/app/lib/db/schema.ts` (reactions table + indexes)
- `ui/app/lib/entries.ts` (attach reactions to visible entries OR expose a fetch
  the timeline composes)
- `ui/app/components/EntryCard.tsx` (react control + reaction display)
- `ui/app/components/TimelineList.tsx` (pass reactions through; mount toasts) OR
  mount `ReactionToasts` on the home/timeline page
- `ui/app/timeline/page.tsx` (fetch reactions + unseen, pass down)
- `ui/app/hooks/useAudio.ts` (`playReactionPop`)

**Not touched:** auth/session/identity, secrets/gift core, AI/retrieval, filters
(beyond reaction attachment).
