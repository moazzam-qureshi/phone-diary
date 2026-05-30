import type { LockedStub } from "@/app/lib/visibility";
import { DISPLAY_NAMES } from "@/app/lib/identity-shared";

function fmt(ts: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  const d = ts instanceof Date ? ts : new Date(ts);
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

// Placeholder for a partner's un-gifted secret. Carries no entry text.
export default function LockedEntryCard({ stub }: { stub: LockedStub }) {
  return (
    <article className="border border-dashed border-dim bg-panel/60 p-3">
      <header className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-accent/50">
        <span>🔒 secret</span>
        <span>{DISPLAY_NAMES[stub.author]}</span>
        <span className="ml-auto tabular-nums text-accent/40">
          {fmt(stub.createdAt)}
        </span>
      </header>
      <p className="mt-2 text-sm italic text-dim">— locked —</p>
    </article>
  );
}
