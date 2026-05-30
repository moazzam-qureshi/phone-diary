"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, SignalHigh, BatteryFull } from "lucide-react";

// Keitai status bar: optional top-left BACK button, signal (left), centered
// screen label, battery + live clock (right). Blue blueprint family.
export default function StatusBar({
  label = "ANALOG LOG",
  back,
}: {
  label?: string;
  back?: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, []);

  const time = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}`
    : "--:--";

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-dim/60 bg-panel pr-3 text-[0.65rem] tracking-widest text-accent">
      <div className="flex min-w-0 items-center gap-2">
        {back ? (
          <Link
            href={back}
            aria-label="back"
            className="flex h-9 items-center gap-0.5 border-r border-dim/50 px-2.5 font-bold uppercase text-accent active:bg-accent active:text-[#00132e]"
          >
            <ChevronLeft size={14} strokeWidth={2.5} aria-hidden />
            back
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 pl-3">
            <SignalHigh size={13} strokeWidth={2} aria-hidden />
            <span className="opacity-70">3G</span>
          </span>
        )}
      </div>

      <span className="truncate px-2 uppercase opacity-80">{label}</span>

      <div className="flex items-center gap-1.5 py-1.5">
        <BatteryFull size={15} strokeWidth={2} aria-hidden />
        <span className="tabular-nums" suppressHydrationWarning>
          {time}
        </span>
      </div>
    </div>
  );
}
