"use client";

import { motion, useDragControls, useReducedMotion } from "motion/react";
import { Minus, X } from "lucide-react";
import { IconTile } from "@/components/system/icon-tile";
import { sfx } from "@/lib/sfx";
import type { RefObject } from "react";
import { apps } from "@/config/apps.config";
import type { OsWindow as OsWindowState } from "@/store/os-store";
import { useOsStore } from "@/store/os-store";

interface OsWindowProps {
  win: OsWindowState;
  stageRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export function OsWindow({ win, stageRef, children }: OsWindowProps) {
  const def = apps[win.id];
  const focus = useOsStore((s) => s.focus);
  const close = useOsStore((s) => s.close);
  const toggleMinimize = useOsStore((s) => s.toggleMinimize);
  const dragControls = useDragControls();
  const reduced = useReducedMotion();

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={stageRef}
      dragMomentum={false}
      dragElastic={0}
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              scale: 0.94,
              clipPath: "inset(46% 0% 46% 0%)",
              filter: "brightness(1.8)",
            }
      }
      animate={{
        opacity: 1,
        scale: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        filter: "brightness(1)",
      }}
      exit={
        reduced
          ? undefined
          : {
              opacity: 0,
              scale: 0.96,
              clipPath: "inset(46% 0% 46% 0%)",
              filter: "brightness(1.8)",
            }
      }
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      onPointerDown={() => focus(win.id)}
      className="system-frame absolute rounded-sm"
      style={{
        left: `min(${win.x}px, calc(100vw - ${def.width}px - 24px))`,
        top: win.y,
        width: def.width,
        maxWidth: "calc(100vw - 48px)",
        zIndex: win.z,
        display: win.minimized ? "none" : undefined,
      }}
      role="dialog"
      aria-label={def.title}
    >
      <div
        onPointerDown={(e) => {
          // stop native text selection from spilling into the window content
          e.preventDefault();
          dragControls.start(e);
        }}
        className="flex cursor-grab touch-none items-center justify-between border-b border-system/25 bg-system/5 px-4 py-2 active:cursor-grabbing"
      >
        <span className="flex items-center gap-2.5 font-heading text-xs tracking-[0.3em] text-system select-none">
          <IconTile icon={def.icon} size="sm" />
          {def.title}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Minimize ${def.title}`}
            onClick={() => {
              sfx.minimize();
              toggleMinimize(win.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-system/15 hover:text-system"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Close ${def.title}`}
            onClick={() => {
              sfx.close();
              close(win.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-destructive/25 hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        </span>
      </div>
      <div className="max-h-[62vh] overflow-y-auto p-5">{children}</div>
    </motion.div>
  );
}
