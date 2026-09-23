"use client";

import { useEffect } from "react";
import { AgentDevBridge } from "@/agent/dev-bridge";
import { AnimatePresence, motion } from "motion/react";
import { systemConfig } from "@/config/system.config";
import { world, zones } from "@/config/world.config";
import { play } from "@/lib/audio";
import { cn } from "@/lib/utils";
import { toneColor } from "@/components/world/assets";
import {
  ArmoryPanel,
  CryptPanel,
  GatePanel,
  GuildPanel,
  StatusPanel,
  TreasuryPanel,
} from "@/components/panels/zone-panels";
import { CvModal, InspectCard } from "@/components/panels/overlays";
import { PanelShell } from "@/components/panels/panel-shell";
import { useWorldStore } from "@/store/world-store";
import {
  InteractPrompt,
  LevelUp,
  Minimap,
  QuestTracker,
  SystemControls,
  Toasts,
  VisitorCard,
  WorldMap,
} from "./hud-widgets";
import { Joystick, KeyboardInput } from "./input";

const PANELS = {
  awakening: StatusPanel,
  guild: GuildPanel,
  crypt: CryptPanel,
  armory: ArmoryPanel,
  treasury: TreasuryPanel,
  gate: GatePanel,
};

/** zone quick-bar: walk to any landmark (1–6 on desktop) */
function ZoneBar() {
  const goTo = useWorldStore((s) => s.goTo);
  const panel = useWorldStore((s) => s.panel);
  const near = useWorldStore((s) => s.nearZone);
  const touch = useWorldStore((s) => s.touch);
  return (
    <nav className="pointer-events-auto flex gap-1 sm:gap-1.5" aria-label="Zones">
      {zones.map((z, i) => {
        const active = panel === z.id || near === z.id;
        return (
          <button
            key={z.id}
            type="button"
            data-active={active}
            onPointerEnter={() => play("hover")}
            onClick={() => {
              play("click");
              goTo(z.id);
            }}
            aria-label={`${z.name} — ${z.section}`}
            className={cn("hud-chip group flex-col !gap-0", touch ? "size-12" : "h-12 px-4")}
            title={`${z.name} — ${z.section}`}
          >
            <z.icon className={touch ? "size-5" : "size-4"} style={{ color: toneColor[z.tone] }} />
            {!touch && (
              <span className="font-display text-[8px] tracking-[0.15em] text-muted-foreground group-hover:text-white">
                {i + 1} · {z.section.split(" ")[0].toUpperCase()}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** the System murmurs now and then while you explore (never over an open panel) */
function useAmbientEvents() {
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const base = systemConfig.eventIntervalMs;
      timer = window.setTimeout(() => {
        const s = useWorldStore.getState();
        if (s.phase === "world" && !s.panel && !s.inspect && !s.cvOpen && !s.mapOpen) {
          const pool = systemConfig.ambientEvents;
          s.pushToast(pool[Math.floor(Math.random() * pool.length)]);
        }
        schedule();
      }, base * (0.7 + Math.random() * 0.6));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, []);
}

export function WorldHud() {
  useAmbientEvents();
  const phase = useWorldStore((s) => s.phase);
  const touch = useWorldStore((s) => s.touch);
  const setTouch = useWorldStore((s) => s.setTouch);
  const panel = useWorldStore((s) => s.panel);

  useEffect(() => {
    void useWorldStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 820px)");
    const sync = () => setTouch(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [setTouch]);

  return (
    <>
      <KeyboardInput />
      <AgentDevBridge />
      <div className="letterbox" data-on={!!panel && !touch} />
      <AnimatePresence>
        {phase === "world" && (
          <motion.div
            key="hud"
            className="pointer-events-none fixed inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            {/* top-left: who you are in this world */}
            <div className={cn("absolute top-3 left-3 flex flex-col gap-2 transition-opacity sm:top-4 sm:left-4", touch && panel && "opacity-0")}>
              <VisitorCard />
              {!touch && !panel && <QuestTracker />}
            </div>

            {/* top-right: controls + minimap */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-3 sm:top-4 sm:right-4">
              <SystemControls />
              {!panel && <Minimap size={touch ? 96 : 150} />}
            </div>

            {/* System toasts: top-center, clear of the panel and the cards */}
            <div className={cn("absolute top-16 left-1/2 -translate-x-1/2 sm:top-4", panel && !touch && "top-32 left-[28%] sm:top-32")}>
              <Toasts />
            </div>

            {/* bottom: interaction prompt + zone bar */}
            <div className={cn("absolute inset-x-0 bottom-3 flex flex-col items-center gap-3 px-2 sm:bottom-5", panel && "opacity-0 [&_*]:!pointer-events-none")}>
              <InteractPrompt />
              <ZoneBar />
              {!touch && <p className="font-display text-[8px] tracking-[0.2em] text-muted-foreground/70">{world.hud.controlsDesktop}</p>}
            </div>

            {touch && !panel && (
              <div className="absolute bottom-24 left-4">
                <Joystick />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PanelShell zones={PANELS} />
      <InspectCard />
      <CvModal />
      <WorldMap />
      <LevelUp />
    </>
  );
}
