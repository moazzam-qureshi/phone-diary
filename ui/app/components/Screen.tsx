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
  showLogout = false,
}: {
  title?: string;
  back?: string; // href for the top-left BACK button
  action?: SoftKey; // single primary action, bottom-right
  children: React.ReactNode;
  bodyClassName?: string;
  showLogout?: boolean; // show a logout control in the status bar's left slot
}) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <StatusBar label={title} back={back} showLogout={showLogout} />
      <main
        className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}
      >
        {children}
      </main>
      {action && <SoftKeyBar action={action} />}
    </div>
  );
}
