"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { systemConfig } from "@/config/system.config";

interface LogLine {
  key: number;
  time: string;
  text: string;
}

const MAX_LINES = 6;

/** Streaming synthetic log — the System's heartbeat, bottom-right of the stage. */
export function SystemLog() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const reduced = useReducedMotion();
  const counter = useRef(0);
  const lastIndex = useRef(-1);

  useEffect(() => {
    const pool = systemConfig.logLines;
    if (pool.length === 0) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const push = () => {
      if (!alive) return;
      let idx = Math.floor(Math.random() * pool.length);
      if (idx === lastIndex.current) idx = (idx + 1) % pool.length;
      lastIndex.current = idx;
      const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
      setLines((current) => [
        ...current.slice(-(MAX_LINES - 1)),
        { key: ++counter.current, time, text: pool[idx] },
      ]);
      timer = setTimeout(push, 1800 + Math.random() * 2600);
    };

    timer = setTimeout(push, 1200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-4 bottom-3 z-10 w-80 rounded-sm bg-background/55 px-3 py-2 font-mono text-[10px] leading-relaxed backdrop-blur-sm"
    >
      <p className="mb-1 font-heading text-[9px] tracking-[0.35em] text-system/70">
        ◆ SYSTEM LOG
      </p>
      {lines.map((line, i) => (
        <motion.p
          key={line.key}
          initial={reduced ? false : { opacity: 0, x: 10 }}
          animate={{ opacity: 0.25 + (0.75 * (i + 1)) / lines.length, x: 0 }}
          transition={{ duration: 0.25 }}
          className="truncate text-muted-foreground"
        >
          <span className="text-system/60">[{line.time}]</span> {line.text}
        </motion.p>
      ))}
      <p className="animate-blink text-system/80">▌</p>
    </div>
  );
}
