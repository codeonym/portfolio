"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@react-three/drei";
import { player } from "@/config/player.config";
import { world } from "@/config/world.config";
import { chime, play, preloadSounds, startMusic } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";

/** rotating hexagram — the System's sigil, pure SVG */
function Sigil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <linearGradient id="sg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--arcane-hot)" />
          <stop offset="1" stopColor="var(--system)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#sg)" strokeWidth="1">
        <circle cx="100" cy="100" r="92" strokeDasharray="2 6" className="origin-center animate-[spin_40s_linear_infinite]" />
        <circle cx="100" cy="100" r="78" opacity="0.6" />
        <g className="origin-center animate-[spin_24s_linear_infinite_reverse]">
          <polygon points="100,28 162,136 38,136" />
          <polygon points="100,172 38,64 162,64" />
        </g>
        <circle cx="100" cy="100" r="34" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

export function LoadingScreen() {
  const phase = useWorldStore((s) => s.phase);
  const setPhase = useWorldStore((s) => s.setPhase);
  const { progress, active } = useProgress();
  const [line, setLine] = useState(0);
  const [tip, setTip] = useState(0);

  useEffect(() => {
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setLine((l) => (l + 1) % world.loading.lines.length);
      // a new tip every few lines — SSR and first paint both show tip 0
      if (tick % 3 === 0) setTip((t) => (t + 1) % world.loading.tips.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase !== "loading" || active || progress < 100) return;
    const id = window.setTimeout(() => setPhase("title"), 600);
    return () => window.clearTimeout(id);
  }, [phase, active, progress, setPhase]);

  return (
    <AnimatePresence>
      {phase === "loading" && (
        <motion.div
          key="loading"
          className="fixed inset-0 z-[70] grid place-items-center bg-void px-6"
          exit={{ opacity: 0, filter: "blur(12px)" }}
          transition={{ duration: 0.9 }}
        >
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <div className="relative grid size-44 place-items-center">
              <Sigil className="absolute inset-0 size-full opacity-80" />
              <span className="font-display text-2xl text-glow-arcane">{Math.round(progress)}%</span>
            </div>
            <p className="mt-8 font-display text-[11px] tracking-[0.5em] text-arcane-hot">
              [ {world.loading.heading} ]
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={line}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 h-6 text-lg text-foreground/85"
              >
                {world.loading.lines[line]}
              </motion.p>
            </AnimatePresence>
            <div className="bar mt-6 w-full">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-8 max-w-sm text-sm text-muted-foreground">
              <span className="font-display text-[9px] tracking-[0.3em] text-system">TIP · </span>
              {world.loading.tips[tip]}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TitleScreen() {
  const phase = useWorldStore((s) => s.phase);
  const setPhase = useWorldStore((s) => s.setPhase);
  const completeQuest = useWorldStore((s) => s.completeQuest);
  const muted = useWorldStore((s) => s.muted);
  const toggleMuted = useWorldStore((s) => s.toggleMuted);

  const enter = (withSound: boolean) => {
    if (withSound === muted) toggleMuted();
    if (withSound) {
      preloadSounds();
      startMusic();
    }
    chime();
    setPhase("world");
    // small delay so the first toast lands after the camera swoop
    window.setTimeout(() => completeQuest("awaken"), 1600);
  };

  useEffect(() => {
    if (phase !== "title") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") enter(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const t = world.title;
  return (
    <AnimatePresence>
      {phase === "title" && (
        <motion.div
          key="title"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-5 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08, filter: "blur(10px)" }}
          transition={{ duration: 0.8 }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,var(--void)_85%)]" />
          <motion.p
            className="relative font-display text-[10px] tracking-[0.45em] text-system sm:text-xs"
            initial={{ opacity: 0, letterSpacing: "1em" }}
            animate={{ opacity: 1, letterSpacing: "0.45em" }}
            transition={{ duration: 1.4, delay: 0.2 }}
          >
            {t.eyebrow}
          </motion.p>
          <motion.h1
            data-text={t.name}
            className="glitch relative mt-5 max-w-full font-display text-[10.5vw] leading-none text-white text-glow-arcane sm:text-8xl lg:text-9xl"
            initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {t.name}
          </motion.h1>
          <motion.p
            className="relative mt-4 text-lg font-medium tracking-wide text-foreground/80 sm:text-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            {player.name} · {t.role}
          </motion.p>

          <motion.div
            className="glass glass-edge notch relative mt-10 w-full max-w-lg px-6 py-5 text-left"
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            <p className="flex items-center gap-2 font-display text-[10px] tracking-[0.3em] text-arcane-hot">
              <span className="grid size-5 place-items-center border border-arcane-hot/70 text-[11px]">!</span>
              NOTIFICATION
            </p>
            <p className="mt-3 text-lg leading-snug text-foreground/90">{t.notice}</p>
          </motion.div>

          <motion.div
            className="relative mt-8 flex flex-col items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 }}
          >
            <button
              type="button"
              onClick={() => enter(true)}
              onPointerEnter={() => play("hover")}
              className="hud-chip group px-14 py-4 font-display text-lg tracking-[0.5em] text-white shadow-[0_0_40px_var(--arcane)]"
              data-active="true"
            >
              {t.enter}
            </button>
            <p className="font-display text-[9px] tracking-[0.3em] text-muted-foreground">{t.enterHint}</p>
            <button
              type="button"
              onClick={() => enter(false)}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t.lite}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
