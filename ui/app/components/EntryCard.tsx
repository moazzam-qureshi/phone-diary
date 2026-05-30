"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Entry } from "@/app/lib/db/schema";
import { setEntryType, deleteEntry } from "@/app/actions/entries";
import {
  ENTRY_TYPES,
  CATEGORIES,
  type Category,
  type EntryType,
} from "@/app/lib/types";
import OutcomeEditor from "./OutcomeEditor";

// Distinct hue per Journey type (readable on the blue keitai screen).
const TYPE_COLOR: Record<EntryType, string> = {
  TURN: "text-cyan-300 border-cyan-300/70",
  PULSE: "text-rose-300 border-rose-300/70",
  MIRROR: "text-violet-300 border-violet-300/70",
  FORGE: "text-emerald-300 border-emerald-300/70",
  TRACE: "text-foreground border-dim",
};

function fmt(ts: string | Date) {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  // keitai-style compact stamp: MM/DD HH:MM
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

function latency(ms: number) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

export default function EntryCard({ entry }: { entry: Entry }) {
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const hasOutcome = !!entry.outcome;
  const type = entry.type as EntryType | null;

  function choose(t: EntryType, cat: Category | null) {
    startTransition(async () => {
      await setEntryType({ id: entry.id, type: t, category: cat });
      setPicking(false);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await deleteEntry(entry.id);
      router.refresh();
    });
  }

  return (
    <article className="border border-dim bg-panel p-3">
      <header className="mb-2 flex items-center gap-2 text-[0.65rem]">
        {type ? (
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            className={`border px-1.5 py-0.5 uppercase tracking-widest ${TYPE_COLOR[type]}`}
            title={entry.typeLocked ? "manually set" : "AI-classified — tap to change"}
          >
            {type}
            {!entry.typeLocked && entry.typeConfidence != null && (
              <span className="ml-1 opacity-50">{entry.typeConfidence}%</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            className="border border-dashed border-dim px-1.5 py-0.5 uppercase tracking-widest text-accent/60"
          >
            untagged
          </button>
        )}
        {entry.category && (
          <span className="uppercase tracking-widest text-accent/50">
            {entry.category}
          </span>
        )}
        <span className="ml-auto tabular-nums text-accent/40">
          {fmt(entry.createdAt)}
        </span>
      </header>

      {picking && (
        <div className="mb-3 flex flex-col gap-2 border-l-2 border-accent/50 pl-2.5">
          <div className="flex flex-wrap gap-1.5">
            {ENTRY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={pending}
                onClick={() => choose(t, entry.category as Category | null)}
                className={`min-h-[36px] border px-2 text-[0.65rem] uppercase tracking-widest ${
                  type === t
                    ? "border-accent bg-accent font-bold text-black"
                    : "border-dim text-accent/75 active:bg-accent/20"
                }`}
              >
                {type === t ? `▸${t}` : t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={pending}
                onClick={() => choose((type ?? "TRACE") as EntryType, c)}
                className={`min-h-[36px] border px-2 text-[0.6rem] uppercase tracking-widest ${
                  entry.category === c
                    ? "border-accent bg-accent font-bold text-black"
                    : "border-dim text-accent/60 active:bg-accent/20"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {entry.text}
      </p>

      {entry.decisionLatencyMs != null && (
        <p className="mt-2 text-[0.65rem] uppercase tracking-widest text-accent">
          ⏱ latency {latency(entry.decisionLatencyMs)}
        </p>
      )}

      {hasOutcome && !editing && (
        <div className="mt-2.5 border-l-2 border-dim pl-2.5 text-sm">
          <span
            className={`text-[0.65rem] uppercase tracking-widest ${
              entry.outcomeSuccess === true
                ? "text-emerald-300"
                : entry.outcomeSuccess === false
                  ? "text-rose-300"
                  : "text-accent/60"
            }`}
          >
            outcome
            {entry.outcomeSuccess === true
              ? " · ok"
              : entry.outcomeSuccess === false
                ? " · fail"
                : ""}
          </span>
          <p className="mt-1 whitespace-pre-wrap text-foreground">
            {entry.outcome}
          </p>
          {entry.outcomeNotes && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-accent/50">
              {entry.outcomeNotes}
            </p>
          )}
        </div>
      )}

      {editing ? (
        <OutcomeEditor
          entryId={entry.id}
          initialOutcome={entry.outcome}
          initialSuccess={entry.outcomeSuccess}
          initialNotes={entry.outcomeNotes}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="mt-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-h-[36px] text-[0.65rem] uppercase tracking-widest text-accent/60 active:text-accent"
          >
            {hasOutcome ? "edit outcome" : "+ outcome"}
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-2 text-[0.65rem]">
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className="min-h-[36px] border border-rose-400/70 px-2 uppercase tracking-widest text-rose-300 active:bg-rose-400 active:text-black disabled:opacity-50"
              >
                {pending ? "…" : "delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[36px] px-2 uppercase tracking-widest text-accent/50"
              >
                cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="delete entry"
              className="min-h-[36px] px-2 text-accent/40 active:text-rose-300"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </article>
  );
}
