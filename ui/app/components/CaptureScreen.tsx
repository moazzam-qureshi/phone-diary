"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEntry } from "@/app/actions/entries";
import Screen from "./Screen";

// Pure text-dump capture. No type/category selection — entries are classified
// later by the AI. The primary action ("LOG") lives on the right soft key,
// keitai-style. BACK returns to the home menu.
export default function CaptureScreen() {
  const [text, setText] = useState("");
  const [secret, setSecret] = useState(false);
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  function submit() {
    if (pending) return;
    if (!text.trim()) {
      setFlash("EMPTY — NOTHING TO RECORD");
      return;
    }
    startTransition(async () => {
      const res = await createEntry({ text, isSecret: secret });
      if (res.ok) {
        setText("");
        setSecret(false);
        setFlash(secret ? "RECORDED · SECRET" : "RECORDED · CLASSIFIED");
        textRef.current?.focus();
        router.refresh();
      } else {
        setFlash(res.error);
      }
    });
  }

  return (
    <Screen
      title="LOG"
      back="/"
      action={{ label: pending ? "…" : "LOG", onClick: submit }}
    >
      <section className="flex h-full min-h-0 flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2 text-[0.7rem] uppercase tracking-widest text-accent/70">
          <span className="flex items-center gap-2">
            <span className="blink">▌</span>
            <span>new entry</span>
          </span>
          <button
            type="button"
            onClick={() => setSecret((s) => !s)}
            aria-pressed={secret}
            className={`border px-2 py-0.5 tracking-widest ${
              secret
                ? "border-accent bg-accent text-black"
                : "border-dim text-accent/60"
            }`}
          >
            {secret ? "🔒 secret" : "🔓 open"}
          </button>
        </div>

        <textarea
          ref={textRef}
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (flash) setFlash(null);
          }}
          placeholder="record reality…"
          className="glass w-full min-h-0 flex-1 resize-none p-3 text-base leading-relaxed text-foreground outline-none placeholder:text-foreground/40 focus:border-accent"
        />

        <div className="min-h-[1rem] text-center text-[0.7rem] uppercase tracking-widest text-accent">
          {flash ? flash : ""}
        </div>
      </section>
    </Screen>
  );
}
