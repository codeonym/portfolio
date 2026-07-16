"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  /** ms per character */
  speed?: number;
  /** ms before typing starts */
  delay?: number;
  className?: string;
  onDone?: () => void;
}

export function TypewriterText({
  text,
  speed = 30,
  delay = 0,
  className,
  onDone,
}: TypewriterTextProps) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const [prevText, setPrevText] = useState(text);

  // reset during render when the text changes (sanctioned "adjust state on prop change" pattern)
  if (prevText !== text) {
    setPrevText(text);
    setCount(0);
  }

  const shown = reduced ? text.length : Math.min(count, text.length);
  const done = shown >= text.length;

  useEffect(() => {
    if (reduced) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            clearInterval(interval);
            return c;
          }
          return c + 1;
        });
      }, speed);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, delay, reduced]);

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  return (
    <span className={cn("font-mono", className)} aria-label={text}>
      {text.slice(0, shown)}
      <span
        aria-hidden
        className={cn("animate-blink text-system", done && "hidden")}
      >
        ▌
      </span>
    </span>
  );
}
