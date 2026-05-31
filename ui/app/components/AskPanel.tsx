"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeLatency } from "@/app/actions/latency";
import Screen from "./Screen";

// Client-safe display names. identity.ts is server-only, so we can't import it
// here; this small map mirrors DISPLAY_NAMES for the target selector.
const NAMES = { author_a: "Moazzam", author_b: "Nuha", both: "Both" } as const;

export default function AskPanel() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [target, setTarget] = useState<"author_a" | "author_b" | "both">(
    "both",
  );
  const [analyzing, startAnalyze] = useTransition();
  const router = useRouter();

  async function ask() {
    if (!query.trim() || streaming) return;
    setAnswer("");
    setStatus(null);
    setStreaming(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, target }),
      });
      if (!res.ok || !res.body) {
        setStatus(
          res.status === 401
            ? "SESSION EXPIRED"
            : res.status === 409
              ? "SET IDENTITY FIRST"
              : "QUERY FAILED",
        );
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch {
      setStatus("CONNECTION INTERRUPTED");
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  }

  function runAnalyze() {
    setStatus(null);
    startAnalyze(async () => {
      const res = await analyzeLatency();
      if (res.ok) {
        setStatus(`LINKED ${res.linked} PAIR(S)`);
        router.refresh();
      } else {
        setStatus(res.error);
      }
    });
  }

  return (
    <Screen
      title="ASK"
      back="/"
      action={{ label: streaming ? "…" : "ASK", onClick: ask }}
    >
      <section className="flex h-full flex-col gap-2 p-3">
        <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-widest text-accent/70">
          <span className="flex items-center gap-2">
            <span className="blink">▌</span>query log
          </span>
          <button
            type="button"
            onClick={runAnalyze}
            disabled={analyzing}
            className="border border-dim px-2 py-1 text-[0.6rem] tracking-widest active:bg-accent/20 disabled:opacity-40"
          >
            {analyzing ? "…" : "⏱ latency"}
          </button>
        </div>

        <div className="flex gap-1.5">
          {(["author_a", "author_b", "both"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTarget(t)}
              aria-pressed={target === t}
              className={`min-h-[32px] flex-1 border px-2 text-[0.6rem] uppercase tracking-widest ${
                target === t
                  ? "border-accent bg-accent text-black"
                  : "border-dim text-accent/60"
              }`}
            >
              {NAMES[t]}
            </button>
          ))}
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
          rows={3}
          placeholder="ask about your patterns…"
          className="glass w-full resize-none p-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-accent"
        />

        <div className="min-h-[1rem] text-[0.7rem] uppercase tracking-widest text-accent">
          {status ? status : streaming ? "querying…" : ""}
        </div>

        {answer && (
          <pre className="glass no-scrollbar flex-1 overflow-y-auto whitespace-pre-wrap p-3 text-sm leading-relaxed text-foreground">
            {answer}
            {streaming && <span className="blink"> ▌</span>}
          </pre>
        )}
      </section>
    </Screen>
  );
}
