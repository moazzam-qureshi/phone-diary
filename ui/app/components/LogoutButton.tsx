"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

// Small corner control on the home menu. Logs out + clears identity.
export default function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => logout())}
      title="log out"
      className="absolute left-2 top-2 z-10 border border-dim px-2 py-0.5 text-[0.6rem] uppercase tracking-widest text-accent/60 active:bg-accent/20 disabled:opacity-40"
    >
      {pending ? "…" : "⏻ logout"}
    </button>
  );
}
