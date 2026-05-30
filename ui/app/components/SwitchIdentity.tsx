"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setViewer } from "@/app/actions/identity";
import {
  DISPLAY_NAMES,
  partnerOf,
  type Author,
} from "@/app/lib/identity-shared";

// Small corner affordance on the home menu to swap who-am-I (honor system,
// open — recovery from a mis-tap; either of you may switch on your own phone).
export default function SwitchIdentity({ viewer }: { viewer: Author }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const other = partnerOf(viewer);

  function swap() {
    start(async () => {
      await setViewer(other);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={swap}
      title="switch identity"
      className="absolute right-2 top-2 z-10 border border-dim px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-accent/60 active:bg-accent/20 disabled:opacity-40"
    >
      {DISPLAY_NAMES[viewer]} ⇄
    </button>
  );
}
