"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Single bottom-right action soft key (keitai-style), e.g. LOG / ASK / FILTER.
// Navigation/back live in the status bar now.
export type SoftKey = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};

export default function SoftKeyBar({ action }: { action: SoftKey }) {
  const cls = `min-h-[46px] inline-flex w-full max-w-xs items-center justify-center gap-1.5 rounded-lg border border-accent/60 bg-accent/15 px-4 text-base text-accent transition-colors active:bg-accent active:text-black ${
    action.disabled ? "pointer-events-none opacity-30" : ""
  }`;
  return (
    <div
      className="glass m-2 flex shrink-0 items-center justify-center rounded-xl px-3 py-2"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      {action.href ? (
        <Link href={action.href} className={cls}>
          {action.label}
          <ChevronRight size={15} strokeWidth={2.5} aria-hidden />
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={cls}>
          {action.label}
          <ChevronRight size={15} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </div>
  );
}
