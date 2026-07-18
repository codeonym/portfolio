"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import type { AppId } from "@/config/apps.config";
import { dockApps } from "@/config/apps.config";
import { AgentDevBridge } from "@/agent/dev-bridge";
import { toggleFullscreen } from "@/hooks/use-fullscreen";
import { sfx } from "@/lib/sfx";
import { topVisibleWindow, useOsStore } from "@/store/os-store";
import { AmbientEvents } from "./ambient-events";
import { AvatarStage } from "./avatar-stage";
import { Dock } from "./dock";
import { StageChrome } from "./stage-chrome";
import { SystemLog } from "./system-log";
import { OsWindow } from "./os-window";
import { TopBar } from "./top-bar";
import { ChronicleApp } from "./apps/chronicle-app";
import { CvApp } from "./apps/cv-app";
import { InspectApp } from "./apps/inspect-app";
import { InventoryApp } from "./apps/inventory-app";
import { NetworkApp } from "./apps/network-app";
import { QuestsApp } from "./apps/quests-app";
import { SkillsApp } from "./apps/skills-app";
import { StatusApp } from "./apps/status-app";

const appComponents: Record<AppId, React.ComponentType> = {
  status: StatusApp,
  quests: QuestsApp,
  skills: SkillsApp,
  inventory: InventoryApp,
  chronicle: ChronicleApp,
  network: NetworkApp,
  cv: CvApp,
  inspect: InspectApp,
};

export function SystemOS() {
  const windows = useOsStore((s) => s.windows);
  const open = useOsStore((s) => s.open);
  const closeTop = useOsStore((s) => s.closeTop);
  const setStageSize = useOsStore((s) => s.setStageSize);
  const stageRef = useRef<HTMLDivElement>(null);
  const booted = useRef(false);

  // the STATUS window greets the visitor once the OS mounts
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    open("status");
  }, [open]);

  // the store needs the live stage size so agent-driven layout
  // commands (arrange, move, resize) can clamp to real bounds
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ width, height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [setStageSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeTop();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // F toggles immersion mode (Esc always exits, courtesy of the browser)
      if (e.key === "f" || e.key === "F") return toggleFullscreen();
      // hotkeys 1–6 launch dock apps, game style (hidden windows have none)
      const slot = Number.parseInt(e.key, 10) - 1;
      if (slot >= 0 && slot < dockApps.length) {
        sfx.open();
        open(dockApps[slot].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeTop, open]);

  // topmost visible window gets the arcane "focused" aura
  const topWindowId = topVisibleWindow(windows)?.id;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar />
      <div ref={stageRef} className="relative flex-1">
        <div aria-hidden className="hex-grid absolute inset-0" />
        {/* faint arcane aura pulsing at the stage edges */}
        <div
          aria-hidden
          className="animate-aura-pulse pointer-events-none absolute inset-0 [animation-duration:9s] [background:radial-gradient(ellipse_at_center,transparent_55%,oklch(0.6_0.21_295/12%)_100%)]"
        />
        <StageChrome />
        <AvatarStage />
        <SystemLog />
        <AmbientEvents />
        <AgentDevBridge />
        <AnimatePresence>
          {windows.map((win) => {
            const App = appComponents[win.id];
            const focused = win.id === topWindowId;
            return (
              <OsWindow
                key={win.id}
                win={win}
                stageRef={stageRef}
                focused={focused}
              >
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
