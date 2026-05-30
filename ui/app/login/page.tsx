import { Lock } from "lucide-react";
import LoginForm from "@/app/components/LoginForm";
import StatusBar from "@/app/components/StatusBar";
import Blueprint from "@/app/components/Blueprint";

export const metadata = { title: "ACCESS — ANALOG LIFE LOG" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden border-x border-dim/40 bg-background">
      <StatusBar label="LOCKED" />
      <main className="relative flex flex-1 flex-col items-center justify-center px-6">
        <Blueprint />
        <div className="relative flex w-full max-w-xs flex-col items-center gap-8">
          <header className="flex flex-col items-center gap-2 text-center">
            <span className="orb h-16 w-16">
              <span className="orb-glyph">
                <Lock size={24} strokeWidth={1.75} />
              </span>
            </span>
            <h1 className="mt-2 text-lg uppercase tracking-[0.35em] text-foreground">
              Analog Life Log
            </h1>
            <p className="text-[0.7rem] uppercase tracking-widest text-accent/50">
              reality recording device
            </p>
          </header>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
