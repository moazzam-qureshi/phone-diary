"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <label
        htmlFor="password"
        className="text-[0.7rem] uppercase tracking-widest text-accent/70"
      >
        access key
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        className="w-full border border-dim bg-panel px-3 py-3 font-mono text-base text-foreground outline-none placeholder:text-dim focus:border-accent"
        placeholder="••••••••"
      />
      {state?.error && (
        <p className="text-sm uppercase tracking-widest text-rose-300">
          &gt; {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] w-full border border-accent bg-accent/15 text-sm font-bold uppercase tracking-[0.2em] text-accent transition-colors active:bg-accent active:text-black disabled:opacity-50"
      >
        {pending ? "verifying…" : "▸ unlock"}
      </button>
    </form>
  );
}
