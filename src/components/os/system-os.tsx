"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import type { AppId } from "@/config/apps.config";
import { useOsStore } from "@/store/os-store";
import { AvatarStage } from "./avatar-stage";
import { Dock } from "./dock";
import { OsWindow } from "./os-window";
import { TopBar } from "./top-bar";
import { ChronicleApp } from "./apps/chronicle-app";
import { QuestsApp } from "./apps/quests-app";
import { SkillsApp } from "./apps/skills-app";
import { StatusApp } from "./apps/status-app";
import { SummonApp } from "./apps/summon-app";

const appComponents: Record<AppId, React.ComponentType> = {
  status: StatusApp,
  quests: QuestsApp,
  skills: SkillsApp,
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
      if (e.key === "Escape") closeTop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTop]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div ref={stageRef} className="relative flex-1">
        <AvatarStage />
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
