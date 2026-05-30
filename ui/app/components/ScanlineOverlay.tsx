// Pure presentational CRT overlay. No JS, no state — mounted once in layout.
export default function ScanlineOverlay() {
  return (
    <>
      <div className="crt-vignette" aria-hidden />
      <div className="scanlines" aria-hidden />
      <div className="flicker" aria-hidden />
    </>
  );
}
