"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { systemConfig } from "@/config/system.config";
import { sfx } from "@/lib/sfx";
import { GlitchText } from "./glitch-text";
import { TypewriterText } from "./typewriter-text";

const SEEN_KEY = "system-boot-seen";
const { lines: bootLines, notification, skipLabel } = systemConfig.boot;

type Phase = "checking" | "booting" | "ready" | "done";

export function BootSequence() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [lineCount, setLineCount] = useState(0);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setPhase(localStorage.getItem(SEEN_KEY) ? "done" : "booting");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== "booting") return;
    if (lineCount >= bootLines.length) {
      const t = setTimeout(() => setPhase("ready"), 400);
      return () => clearTimeout(t);
    }
  }, [phase, lineCount]);

  const accept = () => {
    sfx.enter();
    localStorage.setItem(SEEN_KEY, "1");
    setPhase("done");
  };

  const decline = () => {
    sfx.deny();
    setDeclined(true);
  };

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          key="boot"
          role="dialog"
          aria-label="System boot sequence"
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-10 bg-background px-6"
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.6 }}
        >
          {phase !== "checking" && (
            <>
              <div className="w-full max-w-md space-y-2 font-mono text-sm text-system/80">
                {bootLines.slice(0, lineCount).map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {lineCount < bootLines.length && (
                  <TypewriterText
                    key={lineCount}
                    text={bootLines[lineCount]}
                    speed={18}
                    onDone={() => setLineCount((c) => c + 1)}
                  />
                )}
              </div>

              <AnimatePresence>
                {phase === "ready" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="system-frame animate-pulse-glow w-full max-w-md rounded-sm p-8 text-center"
                  >
                    <p className="mb-4 font-heading text-sm tracking-[0.35em] text-system text-glow">
                      ⚠ {notification.heading}
                    </p>
                    <p className="text-lg leading-relaxed text-foreground/90">
                      {notification.body}
                    </p>
                    <p className="my-3 font-heading text-2xl font-bold tracking-[0.2em] text-glow">
                      <GlitchText text={notification.name} />
                    </p>
                    <p className="font-heading text-sm tracking-[0.2em] text-foreground/80">
                      {notification.question}
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <Button
                        onClick={accept}
                        className="font-heading tracking-[0.3em]"
                        size="lg"
                      >
                        {notification.accept}
                      </Button>
                      <Button
                        onClick={decline}
                        variant="outline"
                        size="lg"
                        className="font-heading tracking-[0.3em] text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                      >
                        {notification.decline}
                      </Button>
                    </div>
                    <AnimatePresence>
                      {declined && (
                        <motion.p
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="animate-flicker mt-4 font-mono text-xs tracking-wider text-destructive"
                        >
                          {notification.declineRejected}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={accept}
                className="font-mono text-xs text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
              >
                {skipLabel}
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
