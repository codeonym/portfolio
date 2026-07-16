/**
 * Decorative HUD chrome framing the desktop stage: corner brackets,
 * crosshair ticks and a sector label. Pure ornament, zero interaction.
 */
export function StageChrome() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3 z-0">
      <span className="absolute top-0 left-0 size-5 border-t-2 border-l-2 border-system/40" />
      <span className="absolute top-0 right-0 size-5 border-t-2 border-r-2 border-system/40" />
      <span className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-system/40" />
      <span className="absolute right-0 bottom-0 size-5 border-r-2 border-b-2 border-system/40" />

      {/* midpoint crosshair ticks */}
      <span className="absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 bg-system/30" />
      <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-system/30" />
      <span className="absolute top-1/2 left-0 h-px w-2 -translate-y-1/2 bg-system/30" />
      <span className="absolute top-1/2 right-0 h-px w-2 -translate-y-1/2 bg-system/30" />

      <p className="absolute bottom-1.5 left-3 font-mono text-[9px] tracking-[0.35em] text-system/40">
        SECTOR 07 · STAGE GRID STABLE
      </p>
    </div>
  );
}
