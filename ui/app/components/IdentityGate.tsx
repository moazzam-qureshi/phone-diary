"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewer } from "@/app/actions/identity";
import { AUTHORS, DISPLAY_NAMES } from "@/app/lib/identity-shared";
import Screen from "./Screen";

// One-time per-device identity pick. Shown when no `als_author` cookie is set
// (including for sessions that predate couple's mode). Auth is separate.
export default function IdentityGate() {
  const [pending, start] = useTransition();
  const router = useRouter();

  function pick(a: string) {
    start(async () => {
      await setViewer(a);
      router.refresh();
    });
  }

  return (
    <Screen title="IDENTITY">
      <section className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-[0.7rem] uppercase tracking-widest text-accent/70">
          who is using this device?
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          {AUTHORS.map((a) => (
            <button
              key={a}
              type="button"
              disabled={pending}
              onClick={() => pick(a)}
              className="min-h-[52px] border border-accent bg-accent/10 text-sm uppercase tracking-widest text-accent active:bg-accent active:text-black disabled:opacity-40"
            >
              I am {DISPLAY_NAMES[a]}
            </button>
          ))}
        </div>
      </section>
    </Screen>
  );
}
