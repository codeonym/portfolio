"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Activity, MapPin, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { player } from "@/config/player.config";
import { systemConfig } from "@/config/system.config";
import { sfx } from "@/lib/sfx";
import { useSoundStore } from "@/store/sound-store";

const XP_PROGRESS = systemConfig.xpProgress;

/** Rotating status ticker — messages from systemConfig.ticker. */
function Ticker() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (systemConfig.ticker.length < 2) return;
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % systemConfig.ticker.length),
      5000,
    );
    return () => clearInterval(interval);
  }, []);

  if (systemConfig.ticker.length === 0) return null;

  return (
    <span className="hidden items-center gap-2 font-mono text-xs text-muted-foreground xl:flex">
      <Activity aria-hidden className="size-3.5 text-system" />
      <span className="relative inline-block min-w-[26ch]">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="inline-block"
          >
            {systemConfig.ticker[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

/** Compact HP/SP readouts mirrored from systemConfig.vitals. */
function MiniVitals() {
  return (
    <span className="hidden items-center gap-3 2xl:flex">
      {systemConfig.vitals.map((vital) => (
        <span key={vital.code} className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-heading text-[10px] tracking-widest",
              vital.tone === "ember" ? "text-destructive" : "text-system",
            )}
          >
            {vital.code}
          </span>
          <span
            className="h-1 w-12 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label={vital.label}
            aria-valuenow={vital.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className={cn(
                "block h-full rounded-full",
                vital.tone === "ember" ? "bg-destructive" : "bg-system",
              )}
              style={{ width: `${vital.percent}%` }}
            />
          </span>
        </span>
      ))}
    </span>
  );
}

export function TopBar() {
  const [now, setNow] = useState<string | null>(null);
  const muted = useSoundStore((s) => s.muted);
  const toggleMuted = useSoundStore((s) => s.toggle);
  const initSound = useSoundStore((s) => s.init);

  useEffect(() => {
    initSound();
  }, [initSound]);

  useEffect(() => {
    const update = () =>
      setNow(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    const raf = requestAnimationFrame(update);
    const interval = setInterval(update, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="z-40 flex items-center justify-between gap-6 border-b border-system/25 bg-background/85 px-5 py-2.5 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <span className="font-heading text-sm font-bold tracking-[0.3em] text-system text-glow">
          ◆ SYSTEM
        </span>
        <Ticker />
      </div>

      <div className="flex items-center gap-6">
        <MiniVitals />
        <div className="flex items-center gap-3">
          <span className="font-heading text-xs tracking-widest text-system">
            LV.{player.level}
          </span>
          <div
            className="xp-shimmer h-1.5 w-28 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="XP to next level"
            aria-valuenow={XP_PROGRESS}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-system to-arcane"
              style={{ width: `${XP_PROGRESS}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {XP_PROGRESS}%
          </span>
        </div>

        <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground lg:flex">
          <MapPin aria-hidden className="size-3.5 text-system" />
          {player.location.toUpperCase()}
        </span>

        <button
          type="button"
          aria-label={muted ? "Unmute System sounds" : "Mute System sounds"}
          onClick={() => {
            toggleMuted();
            // confirm audibly only when turning sound ON
            if (muted) sfx.click();
          }}
          className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-system/15 hover:text-system"
        >
          {muted ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </button>

        <span className="min-w-[9ch] text-right font-mono text-sm text-foreground/90 tabular-nums">
          {now ?? "--:--:--"}
        </span>
      </div>
    </header>
  );
}
