"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ZoneId } from "@/config/types";
import { zoneById } from "@/config/world.config";
import { play } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";
import { toneColor } from "@/components/world/assets";

/**
 * The System window for a zone: a notched obsidian-glass drawer that
 * slides in from the right (desktop) or rises as a bottom sheet
 * (touch). The camera frames the landmark in the space it leaves.
 */
export function PanelShell({ zones }: { zones: Record<ZoneId, () => ReactNode> }) {
  const panel = useWorldStore((s) => s.panel);
  const touch = useWorldStore((s) => s.touch);
  const close = useWorldStore((s) => s.closePanel);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panel) {
      play("open");
      scroller.current?.scrollTo({ top: 0 });
    }
  }, [panel]);

  const zone = panel ? zoneById[panel] : null;
  const Body = panel ? zones[panel] : null;

  return (
    <AnimatePresence mode="wait">
      {zone && Body && (
        <motion.aside
          key={zone.id}
          role="dialog"
          aria-label={`${zone.name} — ${zone.section}`}
          className={
            touch
              ? "glass glass-edge notch sys-panel pointer-events-auto fixed inset-x-2 bottom-2 z-40 flex h-[62dvh] flex-col [--n:16px]"
              : "glass glass-edge notch sys-panel pointer-events-auto fixed top-20 right-4 bottom-4 z-40 flex w-[min(600px,44vw)] flex-col [--n:18px]"
          }
          style={{ ["--tone" as string]: toneColor[zone.tone] }}
          initial={touch ? { y: "100%" } : { x: 80, opacity: 0, clipPath: "inset(0 0 100% 0)" }}
          animate={touch ? { y: 0 } : { x: 0, opacity: 1, clipPath: "inset(0 0 0% 0)" }}
          exit={touch ? { y: "100%" } : { x: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
        >
          <div className="sys-panel__scan" />
          <header className="relative flex items-start gap-4 border-b border-arcane/20 px-5 pt-5 pb-4 sm:px-7">
            <div
              className="grid size-12 shrink-0 rotate-45 place-items-center border"
              style={{ borderColor: toneColor[zone.tone], background: `${toneColor[zone.tone]}1f`, boxShadow: `0 0 24px ${toneColor[zone.tone]}44` }}
            >
              <zone.icon className="size-5 -rotate-45" style={{ color: toneColor[zone.tone] }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[9px] tracking-[0.35em]" style={{ color: toneColor[zone.tone] }}>
                {zone.section.toUpperCase()}
              </p>
              <h2 className="mt-1 font-display text-xl leading-tight text-white sm:text-2xl">{zone.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground italic">{zone.epithet}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                play("close");
                close();
              }}
              className="hud-chip size-9 shrink-0"
            >
              <X className="size-4" />
            </button>
          </header>
          <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            <Body />
          </div>
          {!touch && (
            <footer className="flex items-center gap-2 border-t border-arcane/15 px-7 py-2 font-display text-[8px] tracking-[0.25em] text-muted-foreground">
              <span className="kbd">ESC</span> CLOSE · <span className="kbd">WASD</span> WALK AWAY
            </footer>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
