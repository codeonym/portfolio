"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize, Minimize } from "lucide-react";
import { play } from "@/lib/audio";
import { useWorldStore } from "@/store/world-store";

/**
 * ── IMMERSION MODE ────────────────────────────────────────────
 * Fullscreen exploration: a HUD toggle (and the F key), a System-style
 * transition that masks the canvas resize, and a HUD that fades back
 * while the visitor just looks around.
 */

const onFullscreenChange = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};
const noSubscribe = () => () => {};

/** true while the page is fullscreen */
export function useImmersive() {
  return useSyncExternalStore(onFullscreenChange, () => !!document.fullscreenElement, () => false);
}

/** iPhone Safari has no element fullscreen — the toggle hides there */
function useCanImmerse() {
  return useSyncExternalStore(noSubscribe, () => !!document.fullscreenEnabled, () => false);
}

type LockableOrientation = ScreenOrientation & { lock?: (o: "landscape") => Promise<void> };

/** must run inside a user gesture (click / key press) */
export async function toggleImmersion() {
  if (!document.fullscreenEnabled) return;
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    // phones: the temple is framed for landscape
    if (useWorldStore.getState().touch) await (screen.orientation as LockableOrientation).lock?.("landscape").catch(() => {});
  } catch {
    // refused (no gesture, iframe without allowfullscreen) — stay windowed
  }
}

/** enter / leave fullscreen from code; false when the browser refuses (no recent gesture) */
export async function setImmersion(on: boolean) {
  if (!!document.fullscreenElement === on) return true;
  if (!document.fullscreenEnabled) return false;
  await toggleImmersion();
  return !!document.fullscreenElement === on;
}

export function ImmersionButton() {
  const on = useImmersive();
  const can = useCanImmerse();
  if (!can) return null;
  return (
    <button
      type="button"
      aria-label={on ? "Leave immersive mode" : "Immersive mode (fullscreen)"}
      aria-pressed={on}
      data-active={on}
      onClick={() => void toggleImmersion()}
      className="hud-chip h-9 px-3"
    >
      {on ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
      <span className="kbd hidden sm:inline-grid">F</span>
    </button>
  );
}

/** true after `ms` without pointer / key / wheel input */
export function useIdle(ms: number, enabled: boolean) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timer = window.setTimeout(() => setIdle(true), ms);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), ms);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
      setIdle(false);
    };
  }, [ms, enabled]);
  return enabled && idle;
}

const DURATION = 1.5;
const COPY = {
  enter: { tag: "[ IMMERSION MODE ]", title: "FULL SYNCHRONIZATION", foot: "F · ESC to release" },
  exit: { tag: "[ IMMERSION RELEASED ]", title: "SYNC RELEASED", foot: "F to synchronize again" },
};
/** keyframe timing shared by the shutters: close fast, hold, open */
const SHUTTER = { duration: DURATION, times: [0, 0.2, 0.66, 1], ease: [0.7, 0, 0.2, 1] as const };

/** plays over every fullscreen switch — whichever way it was triggered (button, F, Esc) */
export function ImmersionTransition() {
  const [shown, setShown] = useState<{ key: number; enter: boolean } | null>(null);

  useEffect(() => {
    let timer = 0;
    const onChange = () => {
      const enter = !!document.fullscreenElement;
      play(enter ? "portal" : "close", { volume: 0.8 });
      setShown({ key: performance.now(), enter });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(null), DURATION * 1000 + 100);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.clearTimeout(timer);
    };
  }, []);

  const copy = shown?.enter === false ? COPY.exit : COPY.enter;

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.key}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* shutters: slam shut over the resize, then part on the new frame */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 bg-[#05040b]"
            initial={{ y: "-100%" }}
            animate={{ y: ["-100%", "0%", "0%", "-100%"] }}
            transition={SHUTTER}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-[#05040b]"
            initial={{ y: "100%" }}
            animate={{ y: ["100%", "0%", "0%", "100%"] }}
            transition={SHUTTER}
          />

          {/* the seam where the shutters meet */}
          <motion.div
            className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-[var(--arcane-hot)] shadow-[0_0_28px_6px_oklch(0.62_0.22_295/70%)]"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 0, 1, 1, 1], opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: DURATION, times: [0, 0.14, 0.34, 0.66, 0.8], ease: "easeOut" }}
          />

          {/* corner brackets fly out to the new screen edges */}
          <motion.div
            className="absolute"
            initial={{ inset: "38% 34%", opacity: 0 }}
            animate={{ inset: ["38% 34%", "38% 34%", "3% 2%"], opacity: [0, 1, 0] }}
            transition={{ duration: DURATION, times: [0, 0.3, 1], ease: [0.2, 0.8, 0.2, 1] }}
          >
            {(["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"] as const).map((c) => (
              <span key={c} className={`absolute size-7 border-[var(--arcane-hot)] ${c}`} />
            ))}
          </motion.div>

          {/* System card on the seam */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 1, 0] }}
            transition={{ duration: DURATION, times: [0, 0.2, 0.3, 0.6, 0.68] }}
          >
            <p className="font-display text-[10px] tracking-[0.5em] text-system">{copy.tag}</p>
            <motion.p
              className="bg-[#05040b] px-8 font-display text-2xl tracking-[0.3em] text-white [text-shadow:0_0_24px_oklch(0.62_0.22_295/80%)] sm:text-4xl"
              initial={{ letterSpacing: "0.6em", filter: "blur(6px)" }}
              animate={{ letterSpacing: "0.3em", filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: DURATION * 0.2, ease: "easeOut" }}
            >
              {copy.title}
            </motion.p>
            <div className="h-0.5 w-56 overflow-hidden bg-white/10">
              <motion.div
                className="h-full bg-[var(--arcane-hot)] shadow-[0_0_10px_var(--arcane-hot)]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: DURATION * 0.36, delay: DURATION * 0.22, ease: "easeInOut" }}
              />
            </div>
            <p className="font-display text-[9px] tracking-[0.3em] text-muted-foreground">{copy.foot}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
