"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { systemConfig } from "@/config/system.config";
import type { AmbientEvent, Tone } from "@/config/types";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

interface ActiveEvent extends AmbientEvent {
  key: number;
}

const toneStyles: Record<Tone, { frame: string; heading: string }> = {
  system: { frame: "border-system/40", heading: "text-system" },
  arcane: { frame: "border-arcane/40", heading: "text-arcane" },
  gold: { frame: "border-rank-s/40", heading: "text-rank-s" },
  ember: { frame: "border-destructive/40", heading: "text-destructive" },
};

const VISIBLE_MS = 7000;

/**
 * The System speaks unprompted: ambient notifications drawn from
 * systemConfig.ambientEvents, fired on a jittered interval.
 */
export function AmbientEvents() {
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const reduced = useReducedMotion();
  const counter = useRef(0);
  const lastIndex = useRef(-1);

  useEffect(() => {
    const pool = systemConfig.ambientEvents;
    if (pool.length === 0) return;
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const fire = () => {
      if (!alive) return;
      let idx = Math.floor(Math.random() * pool.length);
      if (idx === lastIndex.current) idx = (idx + 1) % pool.length;
      lastIndex.current = idx;
      const key = ++counter.current;
      sfx.notify();
      setEvents((current) => [...current.slice(-2), { ...pool[idx], key }]);
      timers.add(
        setTimeout(() => {
          if (alive)
            setEvents((current) => current.filter((e) => e.key !== key));
        }, VISIBLE_MS),
      );
      schedule(systemConfig.eventIntervalMs * (0.7 + Math.random() * 0.6));
    };

    const schedule = (delay: number) => {
      timers.add(setTimeout(fire, delay));
    };

    // first transmission arrives shortly after the desktop settles
    schedule(9000);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="absolute top-4 right-4 z-50 flex w-80 flex-col items-end gap-2"
    >
      <AnimatePresence>
        {events.map((event) => {
          const style = toneStyles[event.tone];
          return (
            <motion.button
              key={event.key}
              type="button"
              aria-label={`Dismiss notification: ${event.heading}`}
              onClick={() =>
                setEvents((current) =>
                  current.filter((e) => e.key !== event.key),
                )
              }
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: 48 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "system-frame w-full cursor-pointer rounded-sm px-4 py-3 text-left",
                style.frame,
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 font-heading text-[10px] tracking-[0.3em]",
                  style.heading,
                )}
              >
                <span aria-hidden>◆</span>
                {event.heading}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-foreground/85">
                {event.body}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
