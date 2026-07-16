"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import type { AppId } from "@/config/apps.config";
import { appList } from "@/config/apps.config";
import { sfx } from "@/lib/sfx";
import { useOsStore } from "@/store/os-store";
import { AmbientEvents } from "./ambient-events";
import { AvatarStage } from "./avatar-stage";
import { Dock } from "./dock";
import { StageChrome } from "./stage-chrome";
import { SystemLog } from "./system-log";
import { OsWindow } from "./os-window";
import { TopBar } from "./top-bar";
import { ChronicleApp } from "./apps/chronicle-app";
import { InventoryApp } from "./apps/inventory-app";
import { QuestsApp } from "./apps/quests-app";
import { SkillsApp } from "./apps/skills-app";
import { StatusApp } from "./apps/status-app";
import { SummonApp } from "./apps/summon-app";

const appComponents: Record<AppId, React.ComponentType> = {
  status: StatusApp,
  quests: QuestsApp,
  skills: SkillsApp,
  inventory: InventoryApp,
  chronicle: ChronicleApp,
  summon: SummonApp,
};

export function SystemOS() {
  const windows = useOsStore((s) => s.windows);
  const open = useOsStore((s) => s.open);
  const closeTop = useOsStore((s) => s.closeTop);
  const stageRef = useRef<HTMLDivElement>(null);
  const booted = useRef(false);

  // the STATUS window greets the visitor once the OS mounts
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    open("status");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeTop();
      // hotkeys 1–6 launch apps, game style
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const slot = Number.parseInt(e.key, 10) - 1;
      if (slot >= 0 && slot < appList.length) {
        sfx.open();
        open(appList[slot].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTop, open]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div ref={stageRef} className="relative flex-1">
        <div aria-hidden className="hex-grid absolute inset-0" />
        <StageChrome />
        <AvatarStage />
        <SystemLog />
        <AmbientEvents />
        <AnimatePresence>
          {windows.map((win) => {
            const App = appComponents[win.id];
            return (
              <OsWindow key={win.id} win={win} stageRef={stageRef}>
                <App />
              </OsWindow>
            );
          })}
        </AnimatePresence>
      </div>
      <Dock />
    </div>
  );
}
