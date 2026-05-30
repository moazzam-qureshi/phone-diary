"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ENTRY_TYPES, CATEGORIES } from "@/app/lib/types";
import type { VisibleEntry } from "@/app/lib/visibility";
import type { Author } from "@/app/lib/identity-shared";
import { classifyUntagged } from "@/app/actions/entries";
import Screen from "./Screen";
import EntryCard from "./EntryCard";
import LockedEntryCard from "./LockedEntryCard";
import GiftCard from "./GiftCard";
import GiftNudge from "./GiftNudge";

// Keitai timeline: a list of entries with a collapsible FILTER panel toggled
// from the right soft key. BACK returns to the menu.
export default function TimelineList({
  entries,
  viewer,
}: {
  entries: VisibleEntry[];
  viewer: Author;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [classifying, startClassify] = useTransition();
  const [showFilter, setShowFilter] = useState(false);
  const activeType = params.get("type");
  const activeCategory = params.get("category");
  const untagged = entries.filter(
    (v) => v.kind === "full" && !v.entry.type,
  ).length;
  const giftIds = entries
    .filter((v) => v.kind === "full" && v.gift)
    .map((v) => (v as Extract<VisibleEntry, { kind: "full" }>).entry.id);
  const filtered = !!activeType || !!activeCategory;

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/timeline?${next.toString()}`);
  }

  function runClassify() {
    startClassify(async () => {
      await classifyUntagged();
      router.refresh();
    });
  }

  // keitai list row: selected = inverted box + ▸
  const row = (
    label: string,
    active: boolean,
    onClick: () => void,
    key: string,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] border px-3 text-left text-xs uppercase tracking-widest transition-colors ${
        active
          ? "border-accent bg-accent font-bold text-black"
          : "border-dim text-accent/75 active:bg-accent/20"
      }`}
    >
      {active ? `▸ ${label}` : label}
    </button>
  );

  return (
    <Screen
      title="TIMELINE"
      back="/"
      action={{
        label: filtered ? "FILTER*" : "FILTER",
        onClick: () => setShowFilter((s) => !s),
      }}
    >
      <div className="flex flex-col gap-2 p-3">
        <GiftNudge giftIds={giftIds} />

        {untagged > 0 && (
          <button
            type="button"
            onClick={runClassify}
            disabled={classifying}
            className="min-h-[44px] w-full border border-accent bg-accent/10 text-xs uppercase tracking-widest text-accent active:bg-accent active:text-black disabled:opacity-40"
          >
            {classifying ? "classifying…" : `⚡ classify ${untagged} new`}
          </button>
        )}

        {showFilter && (
          <div className="flex flex-col gap-2 border border-dim bg-panel p-2.5">
            <p className="text-[0.6rem] uppercase tracking-widest text-accent/60">
              type
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {row("ALL", !activeType, () => setParam("type", null), "all-t")}
              {ENTRY_TYPES.map((t) =>
                row(t, activeType === t, () => setParam("type", t), `t-${t}`),
              )}
            </div>
            <p className="mt-1 text-[0.6rem] uppercase tracking-widest text-accent/60">
              category
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {row(
                "ALL",
                !activeCategory,
                () => setParam("category", null),
                "all-c",
              )}
              {CATEGORIES.map((c) =>
                row(
                  c,
                  activeCategory === c,
                  () => setParam("category", c),
                  `c-${c}`,
                ),
              )}
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="py-16 text-center text-xs uppercase tracking-widest text-dim">
            — no entries —
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((v) =>
              v.kind === "locked" ? (
                <LockedEntryCard key={v.stub.id} stub={v.stub} />
              ) : v.gift ? (
                <GiftCard key={v.entry.id} entry={v.entry} />
              ) : (
                <EntryCard
                  key={v.entry.id}
                  entry={v.entry}
                  owner={v.entry.author === viewer}
                />
              ),
            )}
          </div>
        )}
      </div>
    </Screen>
  );
}
