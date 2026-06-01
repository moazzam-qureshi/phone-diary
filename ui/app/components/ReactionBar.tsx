"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReaction, removeReaction } from "@/app/actions/reactions";
import {
  REACTION_EMOJIS,
  MAX_NOTE_LEN,
} from "@/app/lib/reactions-shared";

// Emoji row + optional one-line note, shown on a partner's visible entry.
// `mine` is the viewer's current reaction emoji on this entry (or null).
export default function ReactionBar({
  entryId,
  mine,
  myNote,
}: {
  entryId: string;
  mine: string | null;
  myNote: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(myNote ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  function react(emoji: string) {
    // Re-tapping the active emoji removes the reaction.
    if (emoji === mine) {
      start(async () => {
        await removeReaction({ entryId });
        setOpen(false);
        router.refresh();
      });
      return;
    }
    start(async () => {
      await setReaction({ entryId, emoji, note: note.trim() || undefined });
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-[0.8rem] text-accent/70 active:text-accent"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        {mine ? `${mine} react` : "＋ react"}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-l-2 border-accent/40 pl-2.5">
      <div className="flex flex-wrap gap-1.5">
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            disabled={pending}
            onClick={() => react(e)}
            aria-pressed={e === mine}
            className={`min-h-[34px] min-w-[34px] rounded-lg border text-lg transition-transform active:scale-95 disabled:opacity-40 ${
              e === mine ? "border-accent bg-accent/20" : "border-dim"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LEN))}
        placeholder="add a little note… (optional)"
        className="glass w-full px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-accent"
        style={{ fontFamily: "var(--font-quicksand)" }}
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="self-start text-[0.7rem] text-accent/50 active:text-accent"
      >
        close
      </button>
    </div>
  );
}
