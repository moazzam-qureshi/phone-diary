"use client";

import { useActionState, useState } from "react";
import {
  login,
  setupUser,
  type LoginState,
  type SetupState,
} from "@/app/actions/auth";
import { DISPLAY_NAMES, AUTHORS, type Author } from "@/app/lib/identity-shared";

type Setup = { author_a: boolean; author_b: boolean };

export default function LoginForm({ setup }: { setup: Setup }) {
  const bothClaimed = setup.author_a && setup.author_b;
  const noneClaimed = !setup.author_a && !setup.author_b;

  // unclaimed slots, for the setup affordance
  const unclaimed = AUTHORS.filter((a) => !setup[a]);

  // When nobody is set up, default to the claim flow. Otherwise default to
  // login, with an option to claim a still-open slot.
  const [claiming, setClaiming] = useState<Author | null>(null);

  if (!bothClaimed && (noneClaimed || claiming)) {
    return (
      <SetupView
        claiming={claiming}
        unclaimed={unclaimed}
        onPick={setClaiming}
        onCancel={() => setClaiming(null)}
        allowBackToLogin={!noneClaimed}
      />
    );
  }

  return (
    <LoginView
      unclaimed={bothClaimed ? [] : unclaimed}
      onClaim={(a) => setClaiming(a)}
    />
  );
}

function LoginView({
  unclaimed,
  onClaim,
}: {
  unclaimed: Author[];
  onClaim: (a: Author) => void;
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <label
        htmlFor="passcode"
        className="text-[0.7rem] uppercase tracking-widest text-accent/70"
      >
        passcode
      </label>
      <input
        id="passcode"
        name="passcode"
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

      {unclaimed.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onClaim(a)}
          className="text-[0.65rem] uppercase tracking-widest text-accent/50 underline-offset-2 hover:underline"
        >
          set up {DISPLAY_NAMES[a]}
        </button>
      ))}
    </form>
  );
}

function SetupView({
  claiming,
  unclaimed,
  onPick,
  onCancel,
  allowBackToLogin,
}: {
  claiming: Author | null;
  unclaimed: Author[];
  onPick: (a: Author) => void;
  onCancel: () => void;
  allowBackToLogin: boolean;
}) {
  const [state, action, pending] = useActionState<SetupState, FormData>(
    setupUser,
    undefined,
  );

  // Step 1: choose which slot to claim.
  if (!claiming) {
    return (
      <div className="flex w-full flex-col gap-3">
        <p className="text-center text-[0.7rem] uppercase tracking-widest text-accent/70">
          first time — who are you?
        </p>
        {unclaimed.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onPick(a)}
            className="min-h-[52px] w-full border border-accent bg-accent/10 text-sm uppercase tracking-widest text-accent active:bg-accent active:text-black"
          >
            I am {DISPLAY_NAMES[a]}
          </button>
        ))}
        {allowBackToLogin && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[0.65rem] uppercase tracking-widest text-accent/50 underline-offset-2 hover:underline"
          >
            back to login
          </button>
        )}
      </div>
    );
  }

  // Step 2: set the passcode for the chosen slot.
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input type="hidden" name="author" value={claiming} />
      <p className="text-center text-[0.7rem] uppercase tracking-widest text-accent/70">
        set a passcode for {DISPLAY_NAMES[claiming]}
      </p>
      <input
        name="passcode"
        type="password"
        autoFocus
        autoComplete="new-password"
        placeholder="new passcode"
        className="w-full border border-dim bg-panel px-3 py-3 font-mono text-base text-foreground outline-none placeholder:text-dim focus:border-accent"
      />
      <input
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="confirm passcode"
        className="w-full border border-dim bg-panel px-3 py-3 font-mono text-base text-foreground outline-none placeholder:text-dim focus:border-accent"
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
        {pending ? "saving…" : "▸ set passcode"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-[0.65rem] uppercase tracking-widest text-accent/50 underline-offset-2 hover:underline"
      >
        back
      </button>
    </form>
  );
}
