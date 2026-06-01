"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Entry, Reaction } from "@/app/lib/db/schema";
import {
  setEntryType,
  deleteEntry,
  setSecret as setSecretAction,
  giftEntry,
} from "@/app/actions/entries";
import {
  ENTRY_TYPES,
  CATEGORIES,
  TYPE_LABEL,
  type Category,
  type EntryType,
} from "@/app/lib/types";
import { DISPLAY_NAMES, type Author } from "@/app/lib/identity-shared";
import OutcomeEditor from "./OutcomeEditor";
import ReactionBar from "./ReactionBar";

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

export default function EntryCard({
  entry,
  owner = false,
  viewer,
  reactions = [],
}: {
  entry: Entry;
  owner?: boolean;
  viewer?: Author;
  reactions?: Reaction[];
}) {
  // The viewer's own reaction on this entry (for the react control state).
  const myReaction = viewer
    ? reactions.find((r) => r.author === viewer)
    : undefined;
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

  function toggleSecret() {
    startTransition(async () => {
      await setSecretAction({ id: entry.id, isSecret: !entry.isSecret });
      router.refresh();
    });
  }

  function gift() {
    startTransition(async () => {
      await giftEntry({ id: entry.id });
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
            className={`border px-1.5 py-0.5 tracking-wide ${TYPE_COLOR[type]}`}
            title={entry.typeLocked ? "manually set" : "AI-classified — tap to change"}
          >
            {TYPE_LABEL[type]}
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
                className={`min-h-[36px] border px-2 text-[0.7rem] tracking-wide ${
                  type === t
                    ? "border-accent bg-accent font-bold text-black"
                    : "border-dim text-accent/75 active:bg-accent/20"
                }`}
              >
                {type === t ? `▸ ${TYPE_LABEL[t]}` : TYPE_LABEL[t]}
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

          {owner && (
            <span className="flex items-center gap-2 text-[0.6rem] uppercase tracking-widest">
              <button
                type="button"
                disabled={pending}
                onClick={toggleSecret}
                className="min-h-[36px] px-2 text-accent/60 active:text-accent disabled:opacity-40"
              >
                {entry.isSecret ? "🔒 secret" : "🔓 make secret"}
              </button>
              {entry.isSecret && entry.giftedAt == null && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={gift}
                  className="min-h-[36px] border border-accent/60 px-2 text-accent active:bg-accent active:text-black disabled:opacity-40"
                >
                  🎁 offer as gift
                </button>
              )}
              {entry.isSecret && entry.giftedAt != null && (
                <span className="text-accent/50">🎁 gifted</span>
              )}
            </span>
          )}
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

      {/* Reactions — shown to both people; read-only on your own entries. */}
      {reactions.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1 border-t border-dim/40 pt-2">
          {reactions.map((r) => (
            <div key={r.id} className="flex items-baseline gap-1.5 text-sm">
              <span className="text-base">{r.emoji}</span>
              {r.note && (
                <span
                  className="text-foreground/85"
                  style={{ fontFamily: "var(--font-quicksand)" }}
                >
                  “{r.note}”
                </span>
              )}
              <span className="ml-auto text-[0.7rem] text-accent/50">
                {DISPLAY_NAMES[r.author as Author]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* React control — only on a partner's entry the viewer can see. */}
      {!owner && viewer && (
        <ReactionBar
          entryId={entry.id}
          mine={myReaction?.emoji ?? null}
          myNote={myReaction?.note ?? null}
        />
      )}
    </article>
  );
}
