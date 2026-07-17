"use client";

import {
  motion,
  useDragControls,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { Minus, X } from "lucide-react";
import { IconTile } from "@/components/system/icon-tile";
import { sfx } from "@/lib/sfx";
import { useRef, type RefObject } from "react";
import { apps } from "@/config/apps.config";
import type { OsWindow as OsWindowState } from "@/store/os-store";
import { useOsStore } from "@/store/os-store";
import { cn } from "@/lib/utils";

interface OsWindowProps {
  win: OsWindowState;
  stageRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  /** topmost visible window — gets the arcane aura instead of the ambient blue glow */
  focused?: boolean;
}

const TILT_SPRING = { stiffness: 150, damping: 20 } as const;
/** max hover tilt in degrees (y-axis / x-axis) */
const TILT_Y = 3.5;
const TILT_X = 2.5;

export function OsWindow({ win, stageRef, children, focused }: OsWindowProps) {
  const def = apps[win.id];
  const focus = useOsStore((s) => s.focus);
  const close = useOsStore((s) => s.close);
  const toggleMinimize = useOsStore((s) => s.toggleMinimize);
  const dragControls = useDragControls();
  const reduced = useReducedMotion();
  const dragging = useRef(false);

  // VR panel feel: the window leans toward the cursor while hovered
  const tiltX = useSpring(0, TILT_SPRING);
  const tiltY = useSpring(0, TILT_SPRING);

  const resetTilt = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  const onTiltMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    tiltY.set(nx * TILT_Y);
    tiltX.set(-ny * TILT_X);
  };

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={stageRef}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => {
        dragging.current = true;
        resetTilt();
      }}
      onDragEnd={() => {
        dragging.current = false;
      }}
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
      onPointerMove={onTiltMove}
      onPointerLeave={resetTilt}
      className="absolute"
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
      <motion.div
        style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 900 }}
      >
        <div
          className={cn(
            "system-frame rounded-sm transition-[border-color,box-shadow]",
            focused && "system-frame--focused",
            !reduced && "animate-[float-y_6s_ease-in-out_infinite]",
          )}
          style={{
            // desync the idle float so windows don't bob in formation
            animationDelay: `${(win.id.charCodeAt(0) % 6) * -1.1}s`,
          }}
        >
          <div
            onPointerDown={(e) => {
              // stop native text selection from spilling into the window content
              e.preventDefault();
              dragControls.start(e);
            }}
            className={cn(
              "flex cursor-grab touch-none items-center justify-between border-b px-4 py-2 transition-colors active:cursor-grabbing",
              focused
                ? "border-arcane/30 bg-arcane/10"
                : "border-system/25 bg-system/5",
            )}
          >
            <span
              className={cn(
                "flex items-center gap-2.5 font-heading text-xs tracking-[0.3em] select-none transition-colors",
                focused ? "text-arcane" : "text-system",
              )}
            >
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
        </div>
      </motion.div>
    </motion.div>
  );
}
