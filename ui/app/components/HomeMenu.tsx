"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PencilLine,
  ListTree,
  MessageCircleQuestion,
  Crosshair,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Screen from "./Screen";
import Blueprint from "./Blueprint";

// Steins;Gate flip-phone menu: 2x2 grid of glossy orb icons over a blue
// blueprint backdrop with a vertical "MENU" watermark. Tap an orb (or use
// arrows + Enter) to open. No SELECT soft key — tapping selects.
type MenuItem = { href: string; label: string; Icon: LucideIcon; hint: string };

const ITEMS: MenuItem[] = [
  { href: "/log", label: "LOG", Icon: PencilLine, hint: "record an entry" },
  { href: "/timeline", label: "TIMELINE", Icon: ListTree, hint: "browse the log" },
  { href: "/ask", label: "ASK", Icon: MessageCircleQuestion, hint: "query the AI" },
  {
    href: "/timeline?type=TURN",
    label: "DECISIONS",
    Icon: Crosshair,
    hint: "decision log",
  },
];

export default function HomeMenu() {
  const [sel, setSel] = useState(0);
  const router = useRouter();

  function enter(i = sel) {
    router.push(ITEMS[i].href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key >= "1" && e.key <= String(ITEMS.length)) {
      e.preventDefault();
      enter(Number(e.key) - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSel((s) => (s + 1) % ITEMS.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSel((s) => (s - 1 + ITEMS.length) % ITEMS.length);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 2) % ITEMS.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s + ITEMS.length - 2) % ITEMS.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      enter();
    }
  }

  return (
    <Screen title="MENU">
      <div
        className="relative h-full overflow-hidden outline-none"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <Blueprint />

        {/* vertical MENU watermark */}
        <span
          className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-5xl font-bold tracking-widest text-accent/15"
          style={{ writingMode: "vertical-rl" }}
        >
          MENU
        </span>

        {/* 2x2 orb grid */}
        <div className="relative flex h-full items-center justify-center px-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-7">
            {ITEMS.map((it, i) => {
              const active = i === sel;
              return (
                <button
                  key={it.href}
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => enter(i)}
                  aria-current={active ? "true" : undefined}
                  className="flex flex-col items-center gap-2"
                >
                  <span className={`orb ${active ? "orb-active" : ""} h-16 w-16`}>
                    <span className="orb-glyph">
                      <it.Icon size={26} strokeWidth={1.75} />
                    </span>
                  </span>
                  <span
                    className={`text-[0.7rem] font-bold uppercase tracking-widest ${
                      active ? "text-accent" : "text-foreground/70"
                    }`}
                  >
                    {it.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* hint footer */}
        <p className="absolute inset-x-0 bottom-2 text-center text-[0.6rem] uppercase tracking-widest text-foreground/40">
          {ITEMS[sel].hint}
        </p>
      </div>
    </Screen>
  );
}
