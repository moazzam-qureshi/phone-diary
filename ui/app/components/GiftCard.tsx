"use client";

import { useEffect, useState } from "react";
import type { Entry, Reaction } from "@/app/lib/db/schema";
import { DISPLAY_NAMES, type Author } from "@/app/lib/identity-shared";
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
export default function GiftCard({
  entry,
  viewer,
  reactions = [],
}: {
  entry: Entry;
  viewer?: Author;
  reactions?: Reaction[];
}) {
  const fromName = DISPLAY_NAMES[entry.author as Author];
  // Assume opened on first paint to avoid a wrapped-then-revealed flash for
  // already-seen gifts; the effect corrects it for genuinely new ones.
  const [opened, setOpened] = useState(true);

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
      <EntryCard
        entry={entry}
        owner={false}
        viewer={viewer}
        reactions={reactions}
      />
    </div>
  );
}
