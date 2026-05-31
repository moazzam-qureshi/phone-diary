# Cosy Rainy-Forest Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin phone-diary from the cold retro-terminal look to a cosy rainy-forest aesthetic: a persistent CSS forest backdrop with even full-screen rain + distant lightning, frosted-glass UI on top, Caveat+Quicksand fonts, and a looping rain ambience — all without touching any data/auth/logic.

**Architecture:** One fixed full-viewport `ForestBackdrop` rendered once in `layout.tsx` behind all routes. The palette + a shared `.glass` surface live in `globals.css` as CSS variables/utilities, so most components re-theme by swapping classes. Rain sound is added to the existing `useAudio` hook and started from the existing global pointer listener in `AudioController`. Fonts load via `next/font/google`.

**Tech Stack:** Next.js 16.2.6 (App Router), React 19, Tailwind v4 (CSS-first `@theme`), `next/font/google`, Web Audio + `HTMLAudioElement`.

---

## ⚠️ Read before starting

- **Next.js 16, not training data.** `cookies()`/`headers()` are async; never create `middleware.ts`. This task touches no server APIs, but if unsure check `ui/node_modules/next/dist/docs/01-app/`.
- **No test framework** exists in the repo. Verification = **typecheck + lint + build + manual visual smoke**. There is no unit harness; do not add one (out of scope).
  - Typecheck: `cd ui && npx tsc --noEmit`
  - Lint: `cd ui && npm run lint`
  - Build: `cd ui && npm run build`
- **Run all commands from `ui/`.**
- **This is presentational only.** Do not change any file under `app/lib/`, `app/actions/`, `app/api/`, `proxy.ts`, or the schema/migrations.
- **Tool discipline (learned this session):** make **one mutating tool call per message**; do not batch a typecheck behind edits. After each task, solo-typecheck, then commit.
- The spec is at `docs/superpowers/specs/2026-05-31-cosy-rainy-forest-theme-design.md`.

---

## File Structure

**New:**
- `ui/app/components/ForestBackdrop.tsx` — fixed full-viewport scene: forest layers + rain + lightning. Client component (injects randomized drops).

**Modified:**
- `ui/app/globals.css` — forest palette vars, `.glass` utility, rain/lightning keyframes; remove orb/CRT/blueprint styles + blue glow.
- `ui/app/layout.tsx` — load Caveat+Quicksand; render `ForestBackdrop`; drop `ScanlineOverlay`; forest `themeColor`.
- `ui/app/hooks/useAudio.ts` — looping rain ambience tied to mute state.
- `ui/app/components/AudioController.tsx` — start rain on first user gesture.
- Themed components (class swaps): `HomeMenu`, `Screen`, `StatusBar`, `SoftKeyBar`, `EntryCard`, `LockedEntryCard`, `GiftCard`, `GiftNudge`, `CaptureScreen`, `AskPanel`, `TimelineList`, `LoginForm`, `OutcomeEditor`.

**Removed:**
- `ui/app/components/ScanlineOverlay.tsx`
- `ui/app/components/Blueprint.tsx`

`ui/public/rain.mp3` is already committed (done during brainstorming).

---

## Task 1: Palette + glass + keyframes in globals.css

Re-theme the design tokens and add the shared surfaces, removing the terminal styles.

**Files:**
- Modify: `ui/app/globals.css`

- [ ] **Step 1: Replace the `:root` vars + `@theme` block**

Replace the current `:root { --background … --line }` and the `@theme inline { … }` blocks with:

```css
:root {
  --background: #1a2e22;     /* deep forest */
  --background-2: #243a2c;   /* lifted forest */
  --foreground: #eafae8;     /* pale green-white */
  --accent: #e0ad4e;         /* firefly gold */
  --dim: #5e7d62;            /* mossy border */
  --panel: rgba(20, 40, 28, 0.55); /* translucent forest panel */
  --glass-border: rgba(150, 210, 160, 0.5);
}

@theme inline {
  --color-background: var(--background);
  --color-background-2: var(--background-2);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-dim: var(--dim);
  --color-panel: var(--panel);
  --font-sans: var(--font-quicksand);
  --font-mono: var(--font-quicksand);
  --font-display: var(--font-caveat);
}
```

- [ ] **Step 2: Replace the `body` rule (drop blue glow + mono)**

```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-quicksand), system-ui, sans-serif;
  overflow: hidden;
}
```

- [ ] **Step 3: Delete terminal styles, add cosy ones**

Delete these blocks entirely: `.orb`, `.orb::before`, `.orb-active`, `.orb-glyph`, `.scanlines`, `.crt-vignette`, `.flicker`, `@keyframes flicker`, and the `@media (prefers-reduced-motion){ .flicker }`. Keep `.no-scrollbar`, `.blink`, `@keyframes blink`, and `::selection` (update selection color below).

Update `::selection`:

```css
::selection { background: var(--accent); color: #1a2e22; }
```

Add the glass utility + rain/lightning keyframes at the end of the file:

```css
/* Frosted-glass surface used by every panel/card */
.glass {
  background: var(--panel);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  border: 1.5px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

/* Rain */
@keyframes fall { from { transform: translateY(-12vh); } to { transform: translateY(112vh); } }
.rain-drop {
  position: absolute;
  top: 0;
  width: 1.4px;
  background: linear-gradient(transparent, rgba(210, 235, 220, 0.55));
  animation: fall linear infinite;
}

/* Distant lightning — long cycle, brief double-flicker near the end */
@keyframes lightning {
  0%, 92%, 100% { background: rgba(200, 225, 255, 0); }
  92.6% { background: rgba(210, 230, 255, 0.35); }
  93.0% { background: rgba(200, 225, 255, 0.04); }
  93.5% { background: rgba(215, 235, 255, 0.28); }
  94.3% { background: rgba(200, 225, 255, 0); }
}
.lightning { animation: lightning 45s infinite; }

@media (prefers-reduced-motion: reduce) {
  .rain-drop { animation: none; opacity: 0.22; }
  .lightning { animation: none; }
}
```

- [ ] **Step 4: Typecheck (CSS won't break tsc, but confirm nothing else did)**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS (CSS isn't typechecked; this just confirms a clean baseline).

- [ ] **Step 5: Commit**

```bash
git add ui/app/globals.css
git commit -m "feat(theme): forest palette, glass utility, rain/lightning keyframes"
```

---

## Task 2: ForestBackdrop component

The fixed full-viewport scene. Pure CSS layers + a small effect that injects randomized rain drops (even distribution via negative animation-delay).

**Files:**
- Create: `ui/app/components/ForestBackdrop.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useState } from "react";

type Drop = {
  left: string;
  duration: string;
  delay: string;
  opacity: number;
  height: string;
};

// Fixed, full-viewport rainy-forest scene rendered once behind all routes.
// pointer-events:none everywhere so it never blocks the UI.
export default function ForestBackdrop() {
  // Drops are generated client-side (random) after mount to avoid hydration
  // mismatch. Empty on the server / first paint, then filled in.
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    const N = 80;
    const next: Drop[] = [];
    for (let i = 0; i < N; i++) {
      const dur = 0.7 + Math.random() * 0.6;
      next.push({
        left: `${Math.random() * 100}%`,
        duration: `${dur}s`,
        delay: `${-Math.random() * dur}s`, // key: even top-to-bottom distribution
        opacity: 0.3 + Math.random() * 0.5,
        height: `${26 + Math.random() * 26}px`,
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrops(next);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(#243a2c 0%, #1a2e22 45%, #122019 100%)" }}
      />
      {/* canopy */}
      <div
        className="absolute inset-x-0 top-0 h-[30%]"
        style={{
          background:
            "radial-gradient(120px 70px at 14% -10%, #1b3325 0 70%, transparent 72%)," +
            "radial-gradient(150px 80px at 50% -12%, #18301f 0 70%, transparent 72%)," +
            "radial-gradient(130px 70px at 86% -10%, #1b3325 0 70%, transparent 72%)",
        }}
      />
      {/* far trees */}
      <div
        className="absolute inset-x-0 bottom-0 h-[82%] opacity-50 blur-[2px]"
        style={{
          background:
            "radial-gradient(40px 230px at 10% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(54px 270px at 28% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(46px 250px at 46% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(60px 280px at 66% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(48px 245px at 84% 100%, #2c4634 0 60%, transparent 62%)",
        }}
      />
      {/* trunks */}
      <div className="absolute bottom-0 left-[12%] w-5 rounded-t-md" style={{ height: "60%", background: "linear-gradient(#3a2a1c,#241a11)" }} />
      <div className="absolute bottom-0 left-[48%] w-5 rounded-t-md" style={{ height: "74%", background: "linear-gradient(#3a2a1c,#241a11)" }} />
      <div className="absolute bottom-0 left-[84%] w-5 rounded-t-md" style={{ height: "56%", background: "linear-gradient(#3a2a1c,#241a11)" }} />
      {/* mist */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{ background: "linear-gradient(transparent, rgba(210,230,215,0.15))" }}
      />
      {/* ferns */}
      <span className="absolute -bottom-2 left-[-10px] text-6xl opacity-90 drop-shadow">🌿</span>
      <span className="absolute -bottom-2 right-[-8px] text-6xl opacity-90 drop-shadow">🌿</span>
      {/* rain */}
      <div className="absolute inset-0">
        {drops.map((d, i) => (
          <span
            key={i}
            className="rain-drop"
            style={{
              left: d.left,
              height: d.height,
              opacity: d.opacity,
              animationDuration: d.duration,
              animationDelay: d.delay,
            }}
          />
        ))}
      </div>
      {/* lightning flash */}
      <div className="lightning absolute inset-0" />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add ui/app/components/ForestBackdrop.tsx
git commit -m "feat(theme): ForestBackdrop scene with even rain + lightning"
```

---

## Task 3: Wire fonts + backdrop into layout; remove ScanlineOverlay

**Files:**
- Modify: `ui/app/layout.tsx`

- [ ] **Step 1: Replace the imports + font setup**

Replace the top of the file (the Geist imports + font consts + ScanlineOverlay import) with:

```tsx
import type { Metadata } from "next";
import { Caveat, Quicksand } from "next/font/google";
import "./globals.css";
import ForestBackdrop from "@/app/components/ForestBackdrop";
import AudioController from "@/app/components/AudioController";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});
```

- [ ] **Step 2: Update metadata viewport themeColor**

Change the `themeColor` value in the `viewport` export:

```tsx
  themeColor: "#1a2e22",
```

- [ ] **Step 3: Replace the JSX (font vars, backdrop, drop scanlines)**

```tsx
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="font-sans">
        <ForestBackdrop />
        {children}
        <AudioController />
      </body>
    </html>
  );
```

- [ ] **Step 4: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS. (`ScanlineOverlay` no longer imported; we delete the file in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add ui/app/layout.tsx
git commit -m "feat(theme): load Caveat+Quicksand, mount ForestBackdrop, drop CRT overlay"
```

---

## Task 4: Delete dead terminal components

**Files:**
- Remove: `ui/app/components/ScanlineOverlay.tsx`
- Remove: `ui/app/components/Blueprint.tsx`

- [ ] **Step 1: Confirm Blueprint's only users are the ones we reskin**

Run: `cd ui && npx grep -rn "Blueprint" app || rg -n "Blueprint" app`
(Use the editor's search.) Expected references: `HomeMenu.tsx` and `login/page.tsx` only. Both are reskinned in later tasks; remove the `Blueprint` import/usage from them as part of Task 5 (HomeMenu) and Task 9 (login). If grep shows another user, reskin it too.

- [ ] **Step 2: Delete the files**

```bash
cd ui && rm app/components/ScanlineOverlay.tsx app/components/Blueprint.tsx
```

- [ ] **Step 3: Typecheck (expect errors only where Blueprint is still imported)**

Run: `cd ui && npx tsc --noEmit`
Expected: errors only in `HomeMenu.tsx` / `login/page.tsx` for the now-missing `Blueprint` import. These are fixed in Tasks 5 and 9. If you prefer a clean typecheck before committing, do Step 4 of Task 5 and Task 9's Blueprint removal first, then commit all together. Otherwise commit the deletion together with Task 5.

- [ ] **Step 4: Commit (after HomeMenu no longer imports Blueprint — see Task 5)**

```bash
git add -A ui/app/components/ScanlineOverlay.tsx ui/app/components/Blueprint.tsx
git commit -m "chore(theme): remove CRT scanlines + blueprint backdrop"
```

> Note: this commit is paired with Task 5 so the tree typechecks. Do Task 5 edits, then commit Task 4+5 together if you want a green tree at every commit.

---

## Task 5: Reskin HomeMenu (frosted slots, no orb/blueprint)

**Files:**
- Modify: `ui/app/components/HomeMenu.tsx`

- [ ] **Step 1: Remove Blueprint import + usage**

Delete `import Blueprint from "./Blueprint";` and the `<Blueprint />` element.

- [ ] **Step 2: Replace the orb grid with frosted slots**

Replace the orb `<span className="orb …">` button content. The menu maps `ITEMS`; change each item button to a glass slot. Replace the inner grid markup (the `ITEMS.map(...)` button) with:

```tsx
            {ITEMS.map((it, i) => {
              const active = i === sel;
              return (
                <button
                  key={it.href}
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => enter(i)}
                  aria-current={active ? "true" : undefined}
                  className={`glass flex flex-col items-center gap-2 px-4 py-5 transition-transform ${
                    active ? "scale-105 border-accent" : ""
                  }`}
                >
                  <it.Icon size={26} strokeWidth={1.75} className="text-accent" />
                  <span
                    className={`text-[1.05rem] ${active ? "text-accent" : "text-foreground/85"}`}
                    style={{ fontFamily: "var(--font-caveat)" }}
                  >
                    {it.label}
                  </span>
                </button>
              );
            })}
```

- [ ] **Step 3: Restyle the watermark + hint to cosy**

Change the vertical "MENU" watermark color class from `text-accent/15` to keep but swap font to display, and the hint footer to Quicksand. Update the watermark `<span>` to add `style={{ fontFamily: "var(--font-caveat)" }}`. Leave layout/keyboard logic untouched.

- [ ] **Step 4: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS (Blueprint gone from here; if Task 4 deletion already done, this is the file that clears the error).

- [ ] **Step 5: Commit (pairs with Task 4 deletion)**

```bash
git add ui/app/components/HomeMenu.tsx ui/app/components/ScanlineOverlay.tsx ui/app/components/Blueprint.tsx
git commit -m "feat(theme): cosy frosted home menu; remove orb/scanline/blueprint"
```

---

## Task 6: Reskin the chrome (Screen, StatusBar, SoftKeyBar)

**Files:**
- Modify: `ui/app/components/Screen.tsx`
- Modify: `ui/app/components/StatusBar.tsx`
- Modify: `ui/app/components/SoftKeyBar.tsx`

- [ ] **Step 1: Screen — make the shell transparent so the backdrop shows through**

In `Screen.tsx`, change the outer wrapper class from `… border-x border-dim/40 bg-background` to:

```tsx
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
```

(Drops the opaque `bg-background` and side borders so the forest shows behind the screen.)

- [ ] **Step 2: StatusBar — glass header, display-font title**

Replace the `<header>` class and title span:

```tsx
    <header className="glass m-2 flex h-10 items-center gap-2 rounded-xl px-3">
      {back && (
        <Link
          href={back}
          className="flex items-center gap-1 text-sm text-accent/80 active:text-accent"
        >
          <ArrowLeft size={14} /> back
        </Link>
      )}
      <span
        className="ml-auto text-lg text-foreground/80"
        style={{ fontFamily: "var(--font-caveat)" }}
      >
        {label}
      </span>
    </header>
```

- [ ] **Step 3: SoftKeyBar — glass footer + cosy action button**

Replace the `<footer>`:

```tsx
    <footer className="glass m-2 flex h-12 items-center justify-between rounded-xl px-3">
      <span className="text-xs text-foreground/50">● menu</span>
      <button
        type="button"
        onClick={() => action.onClick?.()}
        className="rounded-lg border border-accent bg-accent/15 px-4 py-1.5 text-sm text-accent active:bg-accent active:text-black"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        {action.label}
      </button>
    </footer>
```

- [ ] **Step 4: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/app/components/Screen.tsx ui/app/components/StatusBar.tsx ui/app/components/SoftKeyBar.tsx
git commit -m "feat(theme): glass screen chrome (status bar + soft keys)"
```

---

## Task 7: Reskin entry cards (EntryCard, LockedEntryCard, GiftCard, GiftNudge)

Swap the terminal classes (`border border-dim bg-panel`, `uppercase tracking-widest`) for `.glass` + cosy fonts. Keep all logic/props/handlers identical.

**Files:**
- Modify: `ui/app/components/EntryCard.tsx`
- Modify: `ui/app/components/LockedEntryCard.tsx`
- Modify: `ui/app/components/GiftCard.tsx`
- Modify: `ui/app/components/GiftNudge.tsx`

- [ ] **Step 1: EntryCard — outer + headings**

In `EntryCard.tsx`, change the root `<article className="border border-dim bg-panel p-3">` to:

```tsx
    <article className="glass p-3.5">
```

Leave the type-badge/outcome/owner-control logic untouched (they read palette vars, which now resolve to forest colors). Optionally soften the recurring `uppercase tracking-widest` on labels by leaving them — they still read fine in forest palette. (No functional change required; the `.glass` + new palette do the heavy lifting.)

- [ ] **Step 2: LockedEntryCard — glass dashed**

Change the root `<article className="border border-dashed border-dim bg-panel/60 p-3">` to:

```tsx
    <article className="glass border-dashed p-3 opacity-90">
```

- [ ] **Step 3: GiftCard — wrapped present uses glass + accent**

In the wrapped (unopened) branch, change the button class `… border border-accent/70 bg-accent/10 p-4 …` to:

```tsx
        className="glass w-full border-accent/70 bg-accent/10 p-4 text-center"
```

Leave the revealed branch (renders `EntryCard`) as-is.

- [ ] **Step 4: GiftNudge — glass banner**

Change its root `<div className="border border-accent bg-accent/10 …">` to:

```tsx
    <div className="glass border-accent bg-accent/10 px-3 py-2 text-center text-sm text-accent">
```

- [ ] **Step 5: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ui/app/components/EntryCard.tsx ui/app/components/LockedEntryCard.tsx ui/app/components/GiftCard.tsx ui/app/components/GiftNudge.tsx
git commit -m "feat(theme): frosted-glass entry / locked / gift cards"
```

---

## Task 8: Reskin Capture, Ask, Timeline filter

**Files:**
- Modify: `ui/app/components/CaptureScreen.tsx`
- Modify: `ui/app/components/AskPanel.tsx`
- Modify: `ui/app/components/TimelineList.tsx`
- Modify: `ui/app/components/OutcomeEditor.tsx`

- [ ] **Step 1: CaptureScreen — glass textarea**

Change the `<textarea>` class `… border border-dim bg-panel … focus:border-accent` to:

```tsx
          className="glass w-full min-h-0 flex-1 resize-none p-3 text-base leading-relaxed text-foreground outline-none placeholder:text-foreground/40 focus:border-accent"
```

The secret toggle button already uses palette classes — leave it.

- [ ] **Step 2: AskPanel — glass textarea + answer panel**

Change the `<textarea>` and the answer `<pre>` to use `glass` (replace their `border border-dim bg-panel` with `glass`). The target selector + latency button already use palette classes; leave them.

- [ ] **Step 3: TimelineList — glass filter panel + classify button**

Change the filter panel container `<div className="flex flex-col gap-2 border border-dim bg-panel p-2.5">` to `className="glass flex flex-col gap-2 p-2.5"`. The `row()` helper buttons read palette vars; leave their logic. The classify button keeps its accent classes.

- [ ] **Step 4: OutcomeEditor — glass inputs**

Replace any `border border-dim bg-panel` on its inputs/wrapper with `glass`. Keep logic/handlers identical.

- [ ] **Step 5: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ui/app/components/CaptureScreen.tsx ui/app/components/AskPanel.tsx ui/app/components/TimelineList.tsx ui/app/components/OutcomeEditor.tsx
git commit -m "feat(theme): glass capture, ask, timeline filter, outcome editor"
```

---

## Task 9: Reskin Login/Setup (remove Blueprint, cosy door-into-woods)

**Files:**
- Modify: `ui/app/login/page.tsx`
- Modify: `ui/app/components/LoginForm.tsx`

- [ ] **Step 1: login/page.tsx — remove Blueprint, drop opaque bg**

Delete `import Blueprint from "@/app/components/Blueprint";` and the `<Blueprint />` element. Change the outer wrapper `… border-x border-dim/40 bg-background` to just the layout (let the backdrop show):

```tsx
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
```

Change the `<h1>` "Analog Life Log" to use the display font:

```tsx
            <h1 className="mt-2 text-3xl text-foreground" style={{ fontFamily: "var(--font-caveat)" }}>
              Phone Diary
            </h1>
```

Wrap the lock orb: the page uses `<span className="orb …">` — replace it with a glass circle:

```tsx
            <span className="glass flex h-16 w-16 items-center justify-center rounded-full">
              <Lock size={24} strokeWidth={1.75} className="text-accent" />
            </span>
```

- [ ] **Step 2: LoginForm.tsx — glass inputs + buttons**

Replace the input class `… border border-dim bg-panel …` (on the passcode + setup inputs) with `glass`. Replace the primary submit button border/bg with the cosy accent button style (keep classes that drive state). The setup "I am X" buttons: change `border border-accent bg-accent/10` to `glass border-accent bg-accent/10`. Keep ALL form/action/state logic identical.

- [ ] **Step 3: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS (Blueprint fully gone now).

- [ ] **Step 4: Commit**

```bash
git add ui/app/login/page.tsx ui/app/components/LoginForm.tsx
git commit -m "feat(theme): cosy login/setup screen"
```

---

## Task 10: Rain ambience in useAudio

Add a looping rain sound tied to the existing mute state, started on first gesture.

**Files:**
- Modify: `ui/app/hooks/useAudio.ts`
- Modify: `ui/app/components/AudioController.tsx`

- [ ] **Step 1: Add rain element + controls to useAudio.ts**

Near the top (after `MUTE_KEY`), add a lazily-created rain audio element + controls. Add this block (module scope, alongside the other module-level audio helpers):

```ts
// --- Looping rain ambience (file-based, gentle, tied to mute) ---
let rainEl: HTMLAudioElement | null = null;

function rainAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!rainEl) {
    rainEl = new Audio("/rain.mp3");
    rainEl.loop = true;
    rainEl.volume = 0.4;
  }
  return rainEl;
}

// Start rain if unmuted. Must be called from a user gesture (autoplay policy).
export function startRain() {
  if (isMuted()) return;
  const el = rainAudio();
  if (!el) return;
  void el.play().catch(() => {
    /* autoplay blocked until a gesture — caller retries on next gesture */
  });
}

function stopRain() {
  if (rainEl) rainEl.pause();
}
```

- [ ] **Step 2: Make the mute toggle also control rain**

In `setMuted(muted)`, after persisting + notifying listeners, add:

```ts
  if (muted) stopRain();
  else startRain();
```

So the existing mute control silences/resumes rain along with the click sounds.

- [ ] **Step 3: Start rain on first gesture in AudioController**

In `AudioController.tsx`, import `startRain` and call it from the existing `onPointerDown` handler (it already fires on every pointer down, satisfying the autoplay-gesture requirement). Update the import and handler:

```tsx
import { useAudio } from "@/app/hooks/useAudio";
import { startRain } from "@/app/hooks/useAudio";
```

and inside `onPointerDown`, before/after the click:

```tsx
    function onPointerDown(e: PointerEvent) {
      startRain(); // no-op if already playing or muted
      const t = e.target as HTMLElement;
      if (t.closest("button, a, [role=button]")) click();
    }
```

(`startRain` is idempotent — calling `play()` on an already-playing element is harmless.)

- [ ] **Step 4: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/app/hooks/useAudio.ts ui/app/components/AudioController.tsx
git commit -m "feat(theme): looping rain ambience tied to mute, started on first gesture"
```

---

## Task 11: Full verification + visual smoke

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `cd ui && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `cd ui && npm run lint`
Expected: 0 errors. Fix any unused imports left from removed components (e.g. a stray `Blueprint`/`ScanlineOverlay` reference, unused `ReactNode`).

- [ ] **Step 3: Build**

Run: `cd ui && npm run build`
Expected: build succeeds, all routes compile.

- [ ] **Step 4: Manual visual smoke (dev server)**

Run: `cd ui && npm run dev` (Postgres up, `.env` set). Verify:
1. **Backdrop** — forest scene visible behind every screen; rain falls evenly top-to-bottom (not bunched at top); wait ~45s for a lightning flash.
2. **Fonts** — headings/titles are handwritten (Caveat); body/buttons are Quicksand.
3. **Glass UI** — menu slots, cards, status/soft-key bars are translucent; forest shows through.
4. **All screens** — login/setup, menu, capture (incl. secret toggle), timeline (incl. filters, locked card, gift card), ask (incl. target selector). No leftover blue/terminal styling.
5. **Rain sound** — on first click, rain ambience starts (if unmuted); mute toggle silences it; unmute resumes.
6. **Reduced motion** — with OS "reduce motion" on, rain freezes and lightning stops.

- [ ] **Step 5: Final commit (only if smoke needed tweaks)**

```bash
git add -A
git commit -m "fix(theme): visual smoke adjustments"
```

---

## Self-Review notes (folded into tasks)

- **Spec coverage:** §1 backdrop → Tasks 1,2,3; §2 surfaces/fonts/palette → Tasks 1,3,5,6,7,8,9; §3 sound → Task 10; §4 removals → Tasks 1,3,4; §5 a11y/scope → Tasks 1 (reduced-motion media query), 11 (smoke). All mapped.
- **No logic touched:** every component task says "keep logic/props/handlers identical" — class/markup swaps only.
- **Commit-greenness:** Task 4 (deletions) is paired with Task 5 (HomeMenu) so the tree typechecks at the commit; login's Blueprint removal is in Task 9.
- **Type consistency:** `startRain`/`stopRain`/`rainAudio` defined once in Task 10 and used by AudioController; `.glass` defined in Task 1, used everywhere after; `--font-caveat`/`--font-quicksand` defined in Task 3, referenced in Tasks 5/6/9.
- **No test framework:** verification is typecheck+lint+build+manual smoke (stated up front); no harness added.
- **Tool discipline:** one mutating call per message; never batch a known-failing typecheck (Task 4 deletion intentionally leaves a transient error fixed in Task 5).
