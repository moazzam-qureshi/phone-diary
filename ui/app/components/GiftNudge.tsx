"use client";

import { useEffect, useState } from "react";

const OPENED_KEY = "als_opened_gifts";

// giftIds = ids of gifts currently visible to the viewer (gifted partner
// secrets). "Waiting" = those this device hasn't opened yet (localStorage).
export default function GiftNudge({ giftIds }: { giftIds: string[] }) {
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    let opened = new Set<string>();
    try {
      opened = new Set(
        JSON.parse(window.localStorage.getItem(OPENED_KEY) || "[]"),
      );
    } catch {
      // ignore malformed storage
    }
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
