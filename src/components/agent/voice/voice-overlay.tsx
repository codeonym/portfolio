"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, X } from "lucide-react";
import type { TaskRecord } from "@/agent/voice/task-queue";
import { speakable } from "@/agent/voice/speech-chunker";
import { world } from "@/config/world.config";
import { cn } from "@/lib/utils";
import { useVoiceStore, voiceLive, type VoicePhase } from "./voice-store";

/**
 * ── VOICE MODE (the immersive layer) ──────────────────────────
 * While the visitor holds V the world goes cinematic: letterbox bars
 * close in, the screen edge breathes with their voice, and an orb of
 * sound bars answers in the System's own voice. Delegated tasks stack
 * on the right and tick off as the text System finishes them.
 * Per-frame values (loudness) are written straight to the DOM.
 */

const copy = world.agent.voice;
const BARS = 56;
/** how long the last exchange stays on screen after the System falls silent */
const LINGER_MS = 6000;
/** how long a finished task stays in the rail */
const TASK_LINGER_MS = 9000;

const LABEL: Record<VoicePhase, string> = {
  idle: copy.hold.toUpperCase(),
  listening: copy.listening,
  decoding: copy.decoding,
  thinking: copy.thinking,
  speaking: copy.speaking,
};

/** listening is the visitor (violet), everything else is the System (blue) */
const tone = (phase: VoicePhase) => (phase === "listening" ? "var(--arcane-hot)" : "var(--color-system)");

function useLinger(active: boolean, ms: number) {
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setLingering(active), active ? 0 : ms);
    return () => window.clearTimeout(timer);
  }, [active, ms]);
  return active || lingering;
}

function Orb({ phase }: { phase: VoicePhase }) {
  const bars = useRef<(SVGRectElement | null)[]>([]);
  const core = useRef<SVGGElement>(null);

  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const t = now / 1000;
      const level = voiceLive.level;
      const p = useVoiceStore.getState().phase;
      const idleShimmer = p === "thinking" || p === "decoding" ? 0.18 : 0.06;
      bars.current.forEach((bar, i) => {
        if (!bar) return;
        const wave = 0.5 + 0.5 * Math.sin(t * 7 + i * 0.9) * Math.sin(t * 2.3 + i * 0.37);
        const h = 3 + (idleShimmer + level * 1.6) * 26 * (0.35 + wave);
        bar.setAttribute("height", h.toFixed(1));
      });
      if (core.current) core.current.style.transform = `scale(${(1 + level * 0.35).toFixed(3)})`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const color = tone(phase);
  const busy = phase === "thinking" || phase === "decoding";
  return (
    <svg viewBox="-80 -80 160 160" className="size-32 overflow-visible sm:size-36" aria-hidden>
      <defs>
        <radialGradient id="voice-core">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="45%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* sound bars around the ring */}
      <g style={{ color }}>
        {Array.from({ length: BARS }, (_, i) => (
          <rect
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            x={-1.1}
            y={40}
            width={2.2}
            height={3}
            rx={1.1}
            fill="currentColor"
            opacity={0.85}
            transform={`rotate(${(i / BARS) * 360})`}
          />
        ))}
      </g>
      {/* thinking: a slow dashed orbit */}
      <circle
        r={33}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3 7"
        opacity={busy ? 0.9 : 0.3}
        className={cn("origin-center transition-opacity [transform-box:fill-box]", busy ? "animate-[spin_2.4s_linear_infinite]" : "animate-[spin_14s_linear_infinite]")}
      />
      <g ref={core} className="origin-center [transform-box:fill-box]">
        <circle r={30} fill="url(#voice-core)" opacity={0.55} />
        <rect x={-9} y={-9} width={18} height={18} transform="rotate(45)" fill="none" stroke="white" strokeWidth={1.4} opacity={0.9} />
        <rect x={-3.5} y={-3.5} width={7} height={7} transform="rotate(45)" fill="white" />
      </g>
    </svg>
  );
}

function EdgeAura({ phase }: { phase: VoicePhase }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      if (el.current) el.current.style.opacity = (0.35 + voiceLive.level * 0.9).toFixed(3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color = phase === "listening" ? "oklch(0.62 0.22 295 / 55%)" : "oklch(0.72 0.14 235 / 45%)";
  return (
    <div
      ref={el}
      className="absolute inset-0 transition-[box-shadow] duration-500"
      style={{ boxShadow: `inset 0 0 140px 24px ${color}, inset 0 0 18px 2px ${color}` }}
    />
  );
}

function TaskCard({ task }: { task: TaskRecord }) {
  const live = task.status === "queued" || task.status === "running";
  return (
    <motion.li
      layout
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn(
        "glass notch relative overflow-hidden border-l-2 px-3 py-2 [--n:8px]",
        task.status === "failed" ? "border-ember" : task.status === "done" ? "border-system" : "border-arcane",
      )}
    >
      {task.status === "running" && (
        <motion.span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-arcane/20 to-transparent"
          animate={{ x: ["-100%", "320%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="relative flex items-center gap-2 font-display text-[9px] tracking-[0.22em]">
        <span className="text-muted-foreground">TASK #{task.n}</span>
        <span
          className={cn(
            "ml-auto flex items-center gap-1",
            task.status === "failed" ? "text-ember" : task.status === "done" ? "text-system" : "text-arcane-hot",
          )}
        >
          {task.status === "done" ? <Check className="size-3" /> : task.status === "failed" ? <X className="size-3" /> : <span className={cn("size-1.5 rotate-45 bg-current", live && "animate-pulse")} />}
          {task.status.toUpperCase()}
        </span>
      </div>
      <p className="relative mt-1 line-clamp-2 text-xs leading-snug text-foreground/85">{task.task}</p>
    </motion.li>
  );
}

function TaskRail({ tasks }: { tasks: readonly TaskRecord[] }) {
  const [now, setNow] = useState(() => Date.now());
  const settledAt = tasks.reduce((max, t) => Math.max(max, t.settledAt ?? 0), 0);
  const pending = tasks.some((t) => t.status === "queued" || t.status === "running");
  // re-evaluate once the most recent finished task should fade out
  useEffect(() => {
    if (pending || !settledAt) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, settledAt + TASK_LINGER_MS - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [pending, settledAt]);
  const shown = tasks.filter((t) => t.status === "queued" || t.status === "running" || (t.settledAt ?? 0) + TASK_LINGER_MS > Math.max(now, settledAt)).slice(-4);

  return (
    <div className="pointer-events-none fixed top-20 right-4 z-[61] w-[min(17rem,70vw)] sm:top-60">
      <AnimatePresence>
        {shown.length > 0 && (
          <motion.p
            key="head"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-2 font-display text-[9px] tracking-[0.35em] text-system"
          >
            [ {copy.tasks} ]
          </motion.p>
        )}
      </AnimatePresence>
      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {shown.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const tail = (text: string, max: number) => (text.length > max ? `…${text.slice(-max).replace(/^\S*\s/, "")}` : text);

export function VoiceOverlay() {
  const phase = useVoiceStore((s) => s.phase);
  const heard = useVoiceStore((s) => s.heard);
  const reply = useVoiceStore((s) => s.reply);
  const notice = useVoiceStore((s) => s.notice);
  const tasks = useVoiceStore((s) => s.tasks);
  const active = phase !== "idle";
  // notices ride the same linger — a muted visitor's caption notice must not pin the panel open
  const shown = useLinger(active, LINGER_MS);

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            key="voice-frame"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* cinematic letterbox */}
            <motion.div
              className="absolute inset-x-0 top-0 h-[7vh] bg-gradient-to-b from-black/85 to-black/0"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 h-[16vh] bg-gradient-to-t from-black/90 to-black/0"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            />
            <EdgeAura phase={phase} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && (
          <motion.section
            key="voice-console"
            role="status"
            aria-live="polite"
            aria-label="Voice link with the System"
            className="pointer-events-none fixed inset-x-0 bottom-24 z-[61] mx-auto flex w-[min(40rem,calc(100vw-2rem))] flex-col items-center gap-2 text-center sm:bottom-28"
            initial={{ y: 40, opacity: 0, filter: "blur(8px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 30, opacity: 0, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 200, damping: 24 }}
          >
            <Orb phase={phase} />
            <motion.p
              key={phase}
              initial={{ letterSpacing: "0.6em", opacity: 0 }}
              animate={{ letterSpacing: "0.35em", opacity: 1 }}
              className="font-display text-[10px] text-system [text-shadow:0_0_14px_oklch(0.72_0.14_235/70%)]"
              style={{ color: tone(phase) }}
            >
              [ {LABEL[phase]} ]
            </motion.p>
            {heard && <p className="max-w-full truncate text-sm text-muted-foreground italic">“{heard}”</p>}
            {reply && (
              <p className="bg-black/45 px-4 py-1.5 text-base leading-relaxed text-foreground [text-shadow:0_1px_8px_black] sm:text-lg">
                {tail(speakable(reply), 260)}
              </p>
            )}
            {notice && <p className="text-sm text-ember">{notice}</p>}
            {phase === "idle" && (
              <p className="font-display text-[9px] tracking-[0.3em] text-muted-foreground/70">
                HOLD <span className="kbd mx-1 inline-grid">{copy.key}</span> TO SPEAK AGAIN
              </p>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <TaskRail tasks={tasks} />
    </>
  );
}
