import { Lock } from "lucide-react";
import LoginForm from "@/app/components/LoginForm";
import StatusBar from "@/app/components/StatusBar";
import { setupState } from "@/app/lib/users";

export const metadata = { title: "ACCESS — ANALOG LIFE LOG" };

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const setup = await setupState();
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <StatusBar label="LOCKED" />
      <main className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative flex w-full max-w-xs flex-col items-center gap-8">
          <header className="flex flex-col items-center gap-2 text-center">
            <span className="glass flex h-16 w-16 items-center justify-center rounded-full">
              <Lock size={24} strokeWidth={1.75} className="text-accent" />
            </span>
            <h1
              className="mt-2 text-3xl text-foreground"
              style={{ fontFamily: "var(--font-caveat)" }}
            >
              Phone Diary
            </h1>
            <p className="text-sm text-accent/60">a cosy place for our days</p>
          </header>
          <LoginForm setup={setup} />
        </div>
      </main>
    </div>
  );
}
