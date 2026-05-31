"use client";

import { useEffect, useState } from "react";

type Drop = {
  left: string;
  duration: string;
  delay: string;
  opacity: number;
  height: string;
};

// Fixed, full-viewport rainy-forest scene rendered once behind all routes.
// pointer-events:none everywhere so it never blocks the UI.
export default function ForestBackdrop() {
  // Drops are generated client-side (random) after mount to avoid hydration
  // mismatch. Empty on the server / first paint, then filled in.
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    const N = 80;
    const next: Drop[] = [];
    for (let i = 0; i < N; i++) {
      const dur = 0.7 + Math.random() * 0.6;
      next.push({
        left: `${Math.random() * 100}%`,
        duration: `${dur}s`,
        delay: `${-Math.random() * dur}s`, // key: even top-to-bottom distribution
        opacity: 0.3 + Math.random() * 0.5,
        height: `${26 + Math.random() * 26}px`,
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrops(next);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(#243a2c 0%, #1a2e22 45%, #122019 100%)",
        }}
      />
      {/* canopy */}
      <div
        className="absolute inset-x-0 top-0 h-[30%]"
        style={{
          background:
            "radial-gradient(120px 70px at 14% -10%, #1b3325 0 70%, transparent 72%)," +
            "radial-gradient(150px 80px at 50% -12%, #18301f 0 70%, transparent 72%)," +
            "radial-gradient(130px 70px at 86% -10%, #1b3325 0 70%, transparent 72%)",
        }}
      />
      {/* far trees */}
      <div
        className="absolute inset-x-0 bottom-0 h-[82%] opacity-50 blur-[2px]"
        style={{
          background:
            "radial-gradient(40px 230px at 10% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(54px 270px at 28% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(46px 250px at 46% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(60px 280px at 66% 100%, #2c4634 0 60%, transparent 62%)," +
            "radial-gradient(48px 245px at 84% 100%, #2c4634 0 60%, transparent 62%)",
        }}
      />
      {/* trunks */}
      <div
        className="absolute bottom-0 left-[12%] w-5 rounded-t-md"
        style={{ height: "60%", background: "linear-gradient(#3a2a1c,#241a11)" }}
      />
      <div
        className="absolute bottom-0 left-[48%] w-5 rounded-t-md"
        style={{ height: "74%", background: "linear-gradient(#3a2a1c,#241a11)" }}
      />
      <div
        className="absolute bottom-0 left-[84%] w-5 rounded-t-md"
        style={{ height: "56%", background: "linear-gradient(#3a2a1c,#241a11)" }}
      />
      {/* mist */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{
          background: "linear-gradient(transparent, rgba(210,230,215,0.15))",
        }}
      />
      {/* ferns */}
      <span className="absolute -bottom-2 left-[-10px] text-6xl opacity-90 drop-shadow">
        🌿
      </span>
      <span className="absolute -bottom-2 right-[-8px] text-6xl opacity-90 drop-shadow">
        🌿
      </span>
      {/* rain */}
      <div className="absolute inset-0">
        {drops.map((d, i) => (
          <span
            key={i}
            className="rain-drop"
            style={{
              left: d.left,
              height: d.height,
              opacity: d.opacity,
              animationDuration: d.duration,
              animationDelay: d.delay,
            }}
          />
        ))}
      </div>
      {/* lightning flash */}
      <div className="lightning absolute inset-0" />
    </div>
  );
}
