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

// Cosy forest menu: 2x2 grid of frosted-glass slots over the shared rainy-forest
// backdrop, with a vertical "MENU" watermark. Tap a slot (or use arrows + Enter)
// to open. No SELECT soft key — tapping selects.
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
    <Screen title="MENU" showLogout>
      <div
        className="relative h-full overflow-hidden outline-none"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {/* vertical MENU watermark */}
        <span
          className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-6xl text-accent/15"
          style={{ writingMode: "vertical-rl", fontFamily: "var(--font-caveat)" }}
        >
          Menu
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
                  className={`glass flex flex-col items-center gap-2 px-5 py-5 transition-transform ${
                    active ? "scale-105 border-accent" : ""
                  }`}
                >
                  <it.Icon
                    size={26}
                    strokeWidth={1.75}
                    className="text-accent"
                  />
                  <span
                    className={`text-[1.05rem] ${
                      active ? "text-accent" : "text-foreground/85"
                    }`}
                    style={{ fontFamily: "var(--font-caveat)" }}
                  >
                    {it.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* hint footer */}
        <p className="absolute inset-x-0 bottom-2 text-center text-sm text-foreground/50">
          {ITEMS[sel].hint}
        </p>
      </div>
    </Screen>
  );
}
