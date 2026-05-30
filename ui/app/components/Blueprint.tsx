// SVG blueprint backdrop for the menu — compass rings, crosshair, ticks.
// Absolutely positioned, non-interactive, faint blue lines.
export default function Blueprint() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 200 320"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="var(--color-line)"
      strokeWidth="0.5"
    >
      {/* center glow */}
      <defs>
        <radialGradient id="bpglow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1b3a6b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#04102a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="320" fill="url(#bpglow)" stroke="none" />

      {/* concentric rings centered ~45% height */}
      <g transform="translate(100 144)">
        <circle r="30" />
        <circle r="55" />
        <circle r="82" />
        <circle r="110" strokeOpacity="0.6" />
        {/* crosshair */}
        <line x1="-130" y1="0" x2="130" y2="0" strokeOpacity="0.5" />
        <line x1="0" y1="-150" x2="0" y2="150" strokeOpacity="0.5" />
        {/* diagonal ticks */}
        <line x1="-92" y1="-92" x2="92" y2="92" strokeOpacity="0.25" />
        <line x1="92" y1="-92" x2="-92" y2="92" strokeOpacity="0.25" />
        {/* tick marks around inner ring */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * Math.PI) / 12;
          const r1 = 55;
          const r2 = i % 3 === 0 ? 48 : 51;
          return (
            <line
              key={i}
              x1={Math.cos(a) * r1}
              y1={Math.sin(a) * r1}
              x2={Math.cos(a) * r2}
              y2={Math.sin(a) * r2}
              strokeOpacity="0.5"
            />
          );
        })}
      </g>

      {/* corner schematic blocks */}
      <rect x="8" y="10" width="36" height="14" strokeOpacity="0.3" />
      <rect x="156" y="296" width="36" height="14" strokeOpacity="0.3" />
    </svg>
  );
}
