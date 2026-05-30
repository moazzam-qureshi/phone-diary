"use client";

import StatusBar from "./StatusBar";
import SoftKeyBar, { type SoftKey } from "./SoftKeyBar";

// The keitai "screen": status bar (with optional top-left BACK), scrollable
// body, and a single bottom action soft key (right corner). `min-h-0` on <main>
// is essential or a tall body pushes the soft bar off-screen.
export default function Screen({
  title,
  back,
  action,
  children,
  bodyClassName = "",
}: {
  title?: string;
  back?: string; // href for the top-left BACK button
  action?: SoftKey; // single primary action, bottom-right
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden border-x border-dim/40 bg-background">
      <StatusBar label={title} back={back} />
      <main
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}
      >
        {children}
      </main>
      {action && <SoftKeyBar action={action} />}
    </div>
  );
}
