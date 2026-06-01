"use client";

import { useEffect, useState } from "react";
import { markReactionsSeen } from "@/app/actions/reactions";
import { playReactionPop } from "@/app/hooks/useAudio";
import type { ReactionToast } from "@/app/lib/reactions-shared";

// Floats new reactions (on the viewer's OWN entries) in as cosy cards on app
// open / navigation, plays a soft pop, then marks them seen server-side so they
// never float again. Auto-dismiss after a few seconds; tap to dismiss early.
export default function ReactionToasts({ toasts }: { toasts: ReactionToast[] }) {
  const [visible, setVisible] = useState<ReactionToast[]>([]);

  useEffect(() => {
    if (toasts.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(toasts);
    playReactionPop();

    // Mark seen immediately (server-side) so a refresh/another device won't
    // re-float them. Non-fatal if it fails.
    void markReactionsSeen({ ids: toasts.map((t) => t.id) }).catch(() => {});

    const timer = setTimeout(() => setVisible([]), 6000);
    return () => clearTimeout(timer);
    // Run once per distinct set of incoming toast ids.
  }, [toasts]);

  if (visible.length === 0) return null;

  function dismiss(id: string) {
    setVisible((v) => v.filter((t) => t.id !== id));
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3">
      {visible.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className="reaction-toast glass pointer-events-auto flex w-full max-w-sm items-start gap-3 px-4 py-3 text-left"
        >
          <span className="text-2xl leading-none">{t.emoji}</span>
          <span className="min-w-0 flex-1">
            <span
              className="block text-sm text-foreground"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              {t.reactorName} reacted{t.note ? `: “${t.note}”` : ""}
            </span>
            <span className="mt-0.5 block truncate text-[0.7rem] text-accent/60">
              on “{t.entrySnippet}”
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
