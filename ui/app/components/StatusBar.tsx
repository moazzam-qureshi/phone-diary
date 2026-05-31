"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, SignalHigh, BatteryFull, Power } from "lucide-react";
import { logout } from "@/app/actions/auth";

// Status bar: left slot (BACK / signal / optional LOGOUT), centered screen
// label, battery + live clock (right). Lives inside the glass chrome so the
// left slot never overlaps anything (fixes floating-logout overlap on small
// screens).
export default function StatusBar({
  label = "ANALOG LOG",
  back,
  showLogout = false,
}: {
  label?: string;
  back?: string;
  showLogout?: boolean;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const [loggingOut, startLogout] = useTransition();

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
    <div className="glass m-2 flex h-10 shrink-0 items-center justify-between rounded-xl px-3 text-sm text-accent">
      <div className="flex min-w-0 items-center gap-2">
        {back ? (
          <Link
            href={back}
            aria-label="back"
            className="flex items-center gap-1 text-accent/80 active:text-accent"
          >
            <ChevronLeft size={14} strokeWidth={2.5} aria-hidden />
            back
          </Link>
        ) : showLogout ? (
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => startLogout(() => logout())}
            aria-label="log out"
            className="flex items-center gap-1 text-accent/80 active:text-accent disabled:opacity-40"
          >
            <Power size={13} strokeWidth={2.5} aria-hidden />
            {loggingOut ? "…" : "logout"}
          </button>
        ) : (
          <span className="flex items-center gap-1.5">
            <SignalHigh size={13} strokeWidth={2} aria-hidden />
            <span className="opacity-70">3G</span>
          </span>
        )}
      </div>

      <span
        className="truncate px-2 text-lg text-foreground/85"
        style={{ fontFamily: "var(--font-caveat)" }}
      >
        {label}
      </span>

      <div className="flex items-center gap-1.5">
        <BatteryFull size={15} strokeWidth={2} aria-hidden />
        <span className="tabular-nums" suppressHydrationWarning>
          {time}
        </span>
      </div>
    </div>
  );
}
