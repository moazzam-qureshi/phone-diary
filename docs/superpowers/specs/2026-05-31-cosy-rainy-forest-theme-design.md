# Design — Cosy Rainy-Forest Theme (visual re-skin)

**Date:** 2026-05-31
**Status:** Approved (brainstorming) — ready for implementation plan

## Goal

Replace phone-diary's cold retro-terminal / Steins;Gate keitai aesthetic with a
**cosy rainy-forest** look (Stardew-valley-rainy-season vibe): a persistent
forest scene behind everything, real animated rain falling through it, occasional
distant lightning, translucent frosted-glass UI floating on top, warm cosy fonts,
and a looping rain ambience.

**This is a presentational re-skin only.** No changes to data, auth, secrets,
gifts, AI, decision-latency, or the timeline filters. Same components and routes;
only styling (and small markup-for-style additions like the backdrop layer).

## Decisions (from brainstorming + visual companion)

- **Scope:** re-skin, keep existing layout/structure.
- **Direction:** rainy **forest as the world**; UI floats on top as translucent
  panels (the "A · Frosted Glass" mock). The forest is the background, not a flat
  colored panel.
- **Rain:** full-viewport, even top-to-bottom (staggered negative animation-delay,
  randomized speed/opacity/length). Freezes under `prefers-reduced-motion`.
- **Lightning:** faint distant full-screen flash ~every 30–60s (double-flicker),
  disabled under `prefers-reduced-motion`.
- **Fonts:** **Caveat** (handwritten) for headings/titles/labels; **Quicksand**
  for body / entry text / buttons. Google Fonts via `next/font`.
- **Sound:** looping **rain ambience** from the user-provided `rain.mp3`. On
  whenever sound is unmuted (after first user gesture — browser autoplay rule);
  silenced by the existing mute toggle. No new UI control.
- **Cards/surfaces:** frosted-glass over the scene everywhere (one consistent
  look; the backdrop is persistent across all screens).
- **Rain toggle:** none beyond `prefers-reduced-motion` auto-freeze.

## Non-goals

- No pixel-art / sprite assets (CSS-only scene; emoji for the few existing icons
  unless already lucide). No asset pipeline beyond the one `rain.mp3`.
- No layout/structure rework, no new screens.
- No behavioral/logic changes anywhere.
- No separate rain on/off control, no volume slider.

---

## Section 1 — Persistent forest backdrop

A single fixed, full-viewport backdrop rendered **once** in `app/layout.tsx`
(behind `{children}`), so every route shares it and it never re-mounts on
navigation. New component `app/components/ForestBackdrop.tsx` (client component —
it injects the randomized rain drops via a small effect).

Layers (all pure CSS, `position: fixed`, `pointer-events: none`, low z-index):
- **Sky**: dark green vertical gradient (`#243a2c → #1a2e22 → #122019`).
- **Canopy**: radial-gradient dark shapes hanging from the top.
- **Far trees**: blurred tall radial-gradient silhouettes along the bottom (~0.5
  opacity).
- **Trunks**: a few `linear-gradient` bark rectangles rising from the bottom.
- **Mist**: bottom-up translucent white-green gradient (~40% height).
- **Ferns**: 🌿 emoji in the lower corners (drop-shadowed).
- **Rain** (`z` above scene, below UI): ~70–90 `.drop` divs, each randomized
  `left`, `animationDuration` (0.7–1.3s), **negative `animationDelay`** (key:
  even distribution), `opacity`, `height`. `@keyframes fall` translateY full
  height. `@media (prefers-reduced-motion: reduce)` → `animation: none; opacity:.25`.
- **Lightning**: a `.flash` overlay with a long keyframe (~30–60s cycle) that
  briefly raises a pale blue background near the end (double-flicker), else
  transparent. Disabled under reduced-motion.

UI content sits at a higher z-index than the backdrop (the backdrop is `fixed`
and behind; existing screens render normally on top).

## Section 2 — UI surfaces (frosted glass) + fonts + palette

**Palette** — redefine the CSS variables in `app/globals.css` to the forest set,
so most components re-theme via variables:
- `--background` deep forest green, `--foreground` pale green-white,
  `--accent` firefly-gold (`#e0ad4e`-ish), `--dim` mossy border, `--panel`
  translucent dark green, plus a frosted-glass token.
- Remove the blue `text-shadow` glow on `body`; remove mono default.

**Frosted-glass surface** — a shared utility (class in `globals.css`, e.g.
`.glass`) used by every panel/card: `background: rgba(20,40,28,.42);
backdrop-filter: blur(3px); border: 1.5px solid rgba(150,210,160,.5);
border-radius; box-shadow` (outer + inner highlight).

**Components reskinned** (markup mostly unchanged; classes swapped):
- `HomeMenu.tsx` — 2×2 frosted slots (replaces `.orb` grid + Blueprint). Caveat
  labels, Quicksand hints.
- `EntryCard.tsx`, `LockedEntryCard.tsx`, `GiftCard.tsx` — frosted cards. Locked
  keeps dashed/dim but in forest palette; gift keeps firefly-gold accent + unwrap.
- `CaptureScreen.tsx`, `AskPanel.tsx`, `TimelineList.tsx` (incl. filter panel),
  `LoginForm.tsx`, `Screen.tsx`, `StatusBar.tsx`, `SoftKeyBar.tsx`,
  `GiftNudge.tsx`, `OutcomeEditor.tsx` — frosted-glass + new fonts; swap any
  hardcoded blue/`uppercase tracking-widest` terminal styling for the cosy set.

**Fonts** — in `app/layout.tsx`, load `Caveat` + `Quicksand` via
`next/font/google`, expose as CSS vars; set `--font-sans: Quicksand`,
a `--font-display: Caveat`. Apply display font to headings/`Screen` titles/labels.

## Section 3 — Rain sound

- Move the provided `rain.mp3` (repo root) → `ui/public/rain.mp3`.
- Extend `app/hooks/useAudio.ts`: add a looping rain ambience. Implementation: an
  `HTMLAudioElement` (`loop = true`, gentle volume ~0.4) created lazily, started
  on the first user gesture / when unmuted, paused when muted. Honors the existing
  `als_muted` localStorage flag and the existing mute pub/sub so it stays in sync.
- No new UI: the current mute toggle controls it. (Browser autoplay policy means
  it can only start after a user interaction — expected.)

## Section 4 — Removed

- `app/components/ScanlineOverlay.tsx` (scanlines + vignette + flicker) — removed
  from `layout.tsx`, replaced by `ForestBackdrop`. File deleted.
- `app/components/Blueprint.tsx` — removed (used by HomeMenu/login). File deleted.
- `globals.css`: delete `.orb*`, `.scanlines`, `.crt-vignette`, `.flicker` +
  its keyframes, the blueprint vars (`--line`), and the body blue glow. Keep
  `.no-scrollbar`, `.blink` (or restyle), add forest vars + `.glass` + rain
  keyframes.
- `app/layout.tsx`: drop `ScanlineOverlay`, the Geist mono default, blue
  `themeColor` → forest green.

## Section 5 — Accessibility & scope guardrails

- Rain + lightning fully disabled under `prefers-reduced-motion`.
- Frosted `backdrop-filter` has a solid-ish fallback color so text stays legible
  where blur is unsupported.
- **No logic touched** — purely visual. Verification is typecheck + lint + build +
  manual visual smoke (no test framework in repo).

---

## Files touched (summary)

**New:**
- `ui/app/components/ForestBackdrop.tsx`
- `ui/public/rain.mp3` (moved from repo root)

**Modified:**
- `ui/app/layout.tsx` (fonts, backdrop, remove scanlines, themeColor)
- `ui/app/globals.css` (palette vars, `.glass`, rain/lightning keyframes; remove
  orb/CRT/blueprint)
- `ui/app/hooks/useAudio.ts` (rain ambience loop)
- All themed components: `HomeMenu`, `EntryCard`, `LockedEntryCard`, `GiftCard`,
  `GiftNudge`, `CaptureScreen`, `AskPanel`, `TimelineList`, `LoginForm`,
  `Screen`, `StatusBar`, `SoftKeyBar`, `OutcomeEditor`

**Removed:**
- `ui/app/components/ScanlineOverlay.tsx`
- `ui/app/components/Blueprint.tsx`

**Not touched (intentionally):** all `app/lib/*` (db, auth, identity, retrieval,
visibility, entries), `app/actions/*`, `app/api/ask/route.ts`, `proxy.ts`,
schema/migrations.
