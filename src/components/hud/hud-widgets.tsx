"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronDown,
  Gauge,
  Map as MapIcon,
  MessageSquareText,
  Sparkle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import type { ZoneId } from "@/config/types";
import { visitorQuests, world, xpPerLevel, zoneById, zones } from "@/config/world.config";
import { chime, duckMusic, play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { toneColor } from "@/components/world/assets";
import { HALL_CENTER_Z, HALL_OUTLINE } from "@/components/world/layout";
import { levelFor, live, useWorldStore, type Quality } from "@/store/world-store";

/* ── visitor card: the visitor's own level, XP and sync rate ── */
export function VisitorCard() {
  const xp = useWorldStore((s) => s.xp);
  const completed = useWorldStore((s) => s.completed.length);
  const level = levelFor(xp);
  const into = xp % xpPerLevel;
  const sync = Math.round((completed / visitorQuests.length) * 100);
  return (
    <div className="glass glass-edge notch pointer-events-auto w-[230px] px-4 py-3 [--n:10px] sm:w-[260px]">
      <div className="flex items-center gap-3">
        <div className="relative grid size-11 shrink-0 place-items-center border border-arcane/60 bg-arcane/15">
          <span className="font-display text-[8px] tracking-widest text-muted-foreground absolute top-0.5">LV</span>
          <motion.span key={level} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 font-display text-lg text-white text-glow-arcane">
            {level}
          </motion.span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[9px] tracking-[0.3em] text-arcane-hot">{world.hud.visitorLabel}</p>
          <p className="truncate text-sm font-semibold text-foreground/90">
            in the domain of <span className="text-white">{player.handle}</span>
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>XP {into}/{xpPerLevel}</span>
        <span className="text-system">{world.hud.syncLabel} {sync}%</span>
      </div>
      <div className="bar mt-1">
        <span style={{ width: `${(into / xpPerLevel) * 100}%` }} />
      </div>
    </div>
  );
}

/* ── system quests: the visitor's objectives ── */
export function QuestTracker() {
  const completed = useWorldStore((s) => s.completed);
  const visited = useWorldStore((s) => s.visited.length);
  const risen = useWorldStore((s) => s.risen.length);
  const [open, setOpen] = useState(true);
  const progress: Record<string, string> = {
    explore: `${visited}/${zones.length}`,
    arise: `${risen}/${quests.length}`,
  };
  return (
    <div className="glass glass-edge notch pointer-events-auto w-[230px] [--n:10px] sm:w-[260px]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-2.5">
        <span className="sys-heading flex-1 !text-[9px]">{world.hud.questsLabel}</span>
        <ChevronDown className={cn("ml-2 size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden px-4">
            {visitorQuests.map((q) => {
              const done = completed.includes(q.id);
              return (
                <li key={q.id} className={cn("flex items-start gap-2 pb-2.5 text-sm", done && "opacity-50")}>
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center border", done ? "border-rank-s bg-rank-s/20 text-rank-s" : "border-arcane/50")}>
                    {done && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className={cn("block font-semibold", done && "line-through")}>{q.name}</span>
                    <span className="block text-xs text-muted-foreground">{q.objective}</span>
                  </span>
                  {progress[q.id] && !done && <span className="font-mono text-[10px] text-system">{progress[q.id]}</span>}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── System toasts, top-right stack ── */
export function Toasts() {
  const toasts = useWorldStore((s) => s.toasts);
  const dismiss = useWorldStore((s) => s.dismissToast);
  const announced = useRef(0);
  useEffect(() => {
    if (!toasts.length) return;
    const last = toasts[toasts.length - 1];
    // sound only for a new prompt, not when an older one is dismissed
    if (last.id > announced.current) {
      announced.current = last.id;
      if (last.heading === world.toasts.questComplete) play("confirm", { volume: 0.4 });
      else chime();
    }
    const id = window.setTimeout(() => dismiss(last.id), 5200);
    return () => window.clearTimeout(id);
  }, [toasts, dismiss]);
  return (
    <div className="pointer-events-none flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scaleY: 0.3 }}
            animate={{ opacity: 1, x: 0, scaleY: 1 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="glass glass-edge notch pointer-events-auto px-4 py-3 [--n:10px]"
            onClick={() => dismiss(t.id)}
          >
            <p className="font-display text-[9px] tracking-[0.3em]" style={{ color: toneColor[t.tone] }}>
              [ {t.heading} ]
            </p>
            <p className="mt-1 text-sm leading-snug text-foreground/90">{t.body}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── LEVEL UP: full-screen burst ── */
export function LevelUp() {
  const level = useWorldStore((s) => s.levelUp);
  const clear = useWorldStore((s) => s.clearLevelUp);
  useEffect(() => {
    if (!level) return;
    play("levelup", { volume: 0.9 });
    duckMusic(3);
    const id = window.setTimeout(clear, 3200);
    return () => window.clearTimeout(id);
  }, [level, clear]);
  return (
    <AnimatePresence>
      {level && (
        <motion.div
          key={level}
          className="pointer-events-none fixed inset-0 z-[55] grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.62_0.22_295/45%),transparent_60%)]"
            initial={{ scale: 0.4 }}
            animate={{ scale: 1.6 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          />
          <div className="relative text-center">
            <motion.p
              className="font-display text-[10px] tracking-[0.6em] text-system"
              initial={{ letterSpacing: "1.4em", opacity: 0 }}
              animate={{ letterSpacing: "0.6em", opacity: 1 }}
            >
              [ SYSTEM ]
            </motion.p>
            <motion.p
              className="mt-3 font-display text-5xl text-white text-glow-arcane sm:text-7xl"
              initial={{ scale: 2.4, opacity: 0, filter: "blur(12px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ type: "spring", stiffness: 160, damping: 14 }}
            >
              {world.toasts.levelUp}
            </motion.p>
            <motion.p className="mt-3 font-display text-lg text-rank-s text-glow-gold" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              LV. {level - 1} → LV. {level}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── "[E] Enter the Guild Hall" ── */
export function InteractPrompt() {
  const near = useWorldStore((s) => s.nearZone);
  const panel = useWorldStore((s) => s.panel);
  const dialogue = useWorldStore((s) => s.dialogueOpen);
  const touch = useWorldStore((s) => s.touch);
  const openPanel = useWorldStore((s) => s.openPanel);
  const setDialogueOpen = useWorldStore((s) => s.setDialogueOpen);
  const zone = near ? zoneById[near] : null;
  // the wraith above the Awakening Circle is THE SYSTEM itself
  const canSpeak = near === "awakening" && !dialogue;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <AnimatePresence>
        {zone && !panel && (
          <motion.button
            key={zone.id}
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              play("open");
              openPanel(zone.id);
            }}
            className="hud-chip pointer-events-auto gap-3 px-6 py-3"
            style={{ boxShadow: `0 0 30px ${toneColor[zone.tone]}55` }}
          >
            <span className="kbd">{touch ? world.hud.tapPrompt : world.hud.promptKey}</span>
            <span className="text-base font-semibold">
              {zone.verb} <span style={{ color: toneColor[zone.tone] }}>{zone.name}</span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· {zone.section}</span>
          </motion.button>
        )}
        {canSpeak && !panel && (
          <motion.button
            key="speak"
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.12 } }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              play("open");
              setDialogueOpen(true);
            }}
            className="hud-chip pointer-events-auto gap-3 px-6 py-3"
            style={{ boxShadow: `0 0 30px ${toneColor.system}66` }}
          >
            <span className="kbd">{touch ? world.hud.tapPrompt : world.agent.promptKey}</span>
            <span className="text-base font-semibold">
              {world.agent.promptVerb} <span style={{ color: toneColor.system }}>{world.agent.name}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── top-right controls ── */
const QUALITY_NEXT: Record<Quality, Quality> = { high: "medium", medium: "low", low: "high" };

export function SystemControls() {
  const muted = useWorldStore((s) => s.muted);
  const toggleMuted = useWorldStore((s) => s.toggleMuted);
  const quality = useWorldStore((s) => s.quality);
  const setQuality = useWorldStore((s) => s.setQuality);
  const mapOpen = useWorldStore((s) => s.mapOpen);
  const setMapOpen = useWorldStore((s) => s.setMapOpen);
  const dialogue = useWorldStore((s) => s.dialogueOpen);
  const setDialogueOpen = useWorldStore((s) => s.setDialogueOpen);
  return (
    <div className="pointer-events-auto flex gap-1.5">
      <button
        type="button"
        aria-label={`${world.agent.promptVerb} ${world.agent.name}`}
        data-active={dialogue}
        onClick={() => {
          play(dialogue ? "close" : "open");
          setDialogueOpen(!dialogue);
        }}
        className="hud-chip h-9 px-3"
      >
        <MessageSquareText className="size-4 text-system" />
        <span className="hidden font-display text-[9px] tracking-[0.2em] sm:inline">SYSTEM</span>
        <span className="kbd hidden sm:inline-grid">{world.agent.promptKey}</span>
      </button>
      <button type="button" aria-label="World map" data-active={mapOpen} onClick={() => { play("open"); setMapOpen(!mapOpen); }} className="hud-chip h-9 px-3">
        <MapIcon className="size-4" />
        <span className="kbd hidden sm:inline-grid">M</span>
      </button>
      <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMuted} className="hud-chip h-9 px-3">
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
      <button
        type="button"
        aria-label={`Graphics quality: ${quality}`}
        onClick={() => { play("click"); setQuality(QUALITY_NEXT[quality]); }}
        className="hud-chip h-9 px-3 font-display text-[9px] tracking-[0.2em]"
      >
        <Gauge className="size-4" />
        <span className="hidden sm:inline">{quality.toUpperCase()}</span>
      </button>
    </div>
  );
}

/* ── minimap: canvas, redrawn every frame from `live` ── */
const MAP_SCALE = 1 / ((world.hall.south - world.hall.north) / 2 + 2);

export function Minimap({ size = 150 }: { size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const setMapOpen = useWorldStore((s) => s.setMapOpen);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size * dpr;
    c.height = size * dpr;
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { visited } = useWorldStore.getState();
      const r = size / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // the hall's floor plan
      ctx.fillStyle = "rgba(20,14,40,0.75)";
      ctx.strokeStyle = "rgba(139,92,246,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      HALL_OUTLINE.forEach(([x, z], i) => {
        const px = r + x * MAP_SCALE * r;
        const py = r + (z - HALL_CENTER_Z) * MAP_SCALE * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // stations
      for (const z of zones) {
        const x = r + z.position[0] * MAP_SCALE * r;
        const y = r + (z.position[1] - HALL_CENTER_Z) * MAP_SCALE * r;
        const seen = visited.includes(z.id);
        ctx.fillStyle = seen ? toneColor[z.tone] : "rgba(160,150,200,0.35)";
        ctx.beginPath();
        ctx.moveTo(x, y - 4.5);
        ctx.lineTo(x + 4.5, y);
        ctx.lineTo(x, y + 4.5);
        ctx.lineTo(x - 4.5, y);
        ctx.closePath();
        ctx.fill();
      }
      // hunter arrow
      const hx = r + live.hunter.x * MAP_SCALE * r;
      const hy = r + (live.hunter.z - HALL_CENTER_Z) * MAP_SCALE * r;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-live.hunter.heading + Math.PI);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#b18cff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 4);
      ctx.lineTo(0, 2);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return (
    <button
      type="button"
      aria-label="Open world map"
      onClick={() => { play("open"); setMapOpen(true); }}
      className="glass glass-edge pointer-events-auto relative grid place-items-center rounded-full p-1.5"
    >
      <canvas ref={canvas} style={{ width: size, height: size }} className="rounded-full" />
      <span className="absolute -bottom-1 font-display text-[8px] tracking-[0.3em] text-arcane-hot">N ▲</span>
    </button>
  );
}

/* ── temple map: fast travel to discovered stations, walk to the rest ── */
const MAP_HALF = (world.hall.south - world.hall.north) / 2 + 3;

export function WorldMap() {
  const open = useWorldStore((s) => s.mapOpen);
  const setOpen = useWorldStore((s) => s.setMapOpen);
  const visited = useWorldStore((s) => s.visited);
  const travelTo = useWorldStore((s) => s.travelTo);
  const goTo = useWorldStore((s) => s.goTo);
  const [hover, setHover] = useState<ZoneId | null>(null);
  const go = (id: ZoneId) => {
    if (visited.includes(id)) travelTo(id);
    else {
      play("click");
      setOpen(false);
      goTo(id);
    }
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-void/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="glass glass-edge notch sys-panel relative w-full max-w-2xl p-5 sm:p-7"
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="sys-heading">{world.hud.mapLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{world.hud.mapHint}</p>
            <div className="relative mx-auto mt-4 aspect-square w-full max-w-[460px]">
              <svg viewBox={`-${MAP_HALF} ${HALL_CENTER_Z - MAP_HALF} ${MAP_HALF * 2} ${MAP_HALF * 2}`} className="absolute inset-0 size-full">
                <polygon
                  points={HALL_OUTLINE.map(([x, z]) => `${x},${z}`).join(" ")}
                  fill="rgba(20,14,40,0.8)"
                  stroke="var(--arcane)"
                  strokeOpacity="0.6"
                  strokeWidth="0.3"
                />
                {/* the carpet up the nave, Gate to throne */}
                <line x1={0} y1={world.hall.south} x2={0} y2={zoneById.awakening.position[1] + 3} stroke="var(--arcane)" strokeOpacity="0.3" strokeWidth="1.6" />
              </svg>
              {zones.map((z) => {
                const seen = visited.includes(z.id);
                const Icon = z.icon;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => go(z.id)}
                    onPointerEnter={() => { setHover(z.id); play("hover"); }}
                    onPointerLeave={() => setHover(null)}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                    style={{ left: `${50 + (z.position[0] / (MAP_HALF * 2)) * 100}%`, top: `${50 + ((z.position[1] - HALL_CENTER_Z) / (MAP_HALF * 2)) * 100}%` }}
                  >
                    <span
                      className={cn("grid size-10 rotate-45 place-items-center border transition-transform hover:scale-110 sm:size-12", !seen && "opacity-60")}
                      style={{ borderColor: toneColor[z.tone], background: `${toneColor[z.tone]}22`, boxShadow: `0 0 18px ${toneColor[z.tone]}55` }}
                    >
                      <Icon className="size-4 -rotate-45 sm:size-5" style={{ color: toneColor[z.tone] }} />
                    </span>
                    <span className="whitespace-nowrap font-display text-[8px] tracking-[0.15em] sm:text-[9px]">{seen ? z.name.toUpperCase() : "???"}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex min-h-12 items-center justify-center gap-2 text-center text-sm">
              {hover ? (
                <>
                  <Sparkle className="size-3.5 text-arcane-hot" />
                  <span className="font-semibold">{visited.includes(hover) ? zoneById[hover].name : "Undiscovered zone"}</span>
                  <span className="text-muted-foreground">
                    · {visited.includes(hover) ? `${zoneById[hover].section} — fast travel` : "walk there to discover it"}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{visited.length}/{zones.length} zones discovered</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
