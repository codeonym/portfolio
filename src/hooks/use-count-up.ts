"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Counts from 0 to target once `start` is true; instant under reduced motion. */
export function useCountUp(target: number, start: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!start || reduced || started.current) return;
    started.current = true;

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - t0) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration, reduced]);

  return reduced ? target : value;
}
