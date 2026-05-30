"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attachOutcome } from "@/app/actions/entries";

export default function OutcomeEditor({
  entryId,
  initialOutcome,
  initialSuccess,
  initialNotes,
  onDone,
}: {
  entryId: string;
  initialOutcome?: string | null;
  initialSuccess?: boolean | null;
  initialNotes?: string | null;
  onDone: () => void;
}) {
  const [outcome, setOutcome] = useState(initialOutcome ?? "");
  const [success, setSuccess] = useState<boolean | null>(
    initialSuccess ?? null,
  );
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    if (!outcome.trim()) {
      setError("OUTCOME REQUIRED");
      return;
    }
    startTransition(async () => {
      const res = await attachOutcome({
        id: entryId,
        outcome,
        outcomeSuccess: success,
        outcomeNotes: notes || undefined,
      });
      if (res.ok) {
        router.refresh();
        onDone();
      } else {
        setError(res.error);
      }
    });
  }

  const successBtn = (label: string, val: boolean | null) => (
    <button
      type="button"
      onClick={() => setSuccess(val)}
      aria-pressed={success === val}
      className={`min-h-[36px] border px-2.5 text-[0.65rem] uppercase tracking-widest ${
        success === val
          ? "border-accent bg-accent font-bold text-black"
          : "border-dim text-accent/70 active:bg-accent/20"
      }`}
    >
      {success === val ? `▸${label}` : label}
    </button>
  );

  return (
    <div className="mt-3 flex flex-col gap-2 border-l-2 border-accent/50 pl-2.5">
      <textarea
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        placeholder="result / metric change…"
        className="w-full resize-none border border-dim bg-background p-2 text-sm text-foreground outline-none placeholder:text-dim focus:border-accent"
        rows={2}
        autoFocus
      />
      <div className="flex items-center gap-1.5">
        {successBtn("ok", true)}
        {successBtn("fail", false)}
        {successBtn("n/a", null)}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="notes (optional)…"
        className="w-full resize-none border border-dim bg-background p-2 text-xs text-foreground outline-none placeholder:text-dim focus:border-accent"
        rows={2}
      />
      {error && (
        <span className="text-xs uppercase tracking-widest text-rose-300">
          &gt; {error}
        </span>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-[44px] flex-1 border border-accent bg-accent/10 text-xs uppercase tracking-widest text-accent active:bg-accent active:text-black disabled:opacity-50"
        >
          {pending ? "…" : "save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-[44px] px-4 text-xs uppercase tracking-widest text-accent/60 active:text-accent"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
