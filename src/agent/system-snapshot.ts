import { useMemo } from "react";
import type { AppId } from "@/config/apps.config";
import { appList } from "@/config/apps.config";
import { chronicle, achievements } from "@/config/chronicle.config";
import {
  inventoryCategories,
  inventoryItems,
} from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skillSets, skills } from "@/config/skills.config";
import { systemConfig } from "@/config/system.config";
import type { InspectTarget } from "@/config/types";
import { useFullscreen } from "@/hooks/use-fullscreen";
import type { OsWindow, StageSize } from "@/store/os-store";
import { topVisibleWindow, useOsStore } from "@/store/os-store";
import { useSoundStore } from "@/store/sound-store";

/**
 * ── AGENT BRIDGE · READ SIDE ──────────────────────────────────
 * One serializable snapshot of everything an AI agent needs to
 * reason about the System: live window geometry, the app registry,
 * and the Player's full dossier (CV data). Icons and React types
 * are stripped — every value here survives JSON.stringify.
 *
 * V5 wiring (CopilotKit v2): pass `useSystemSnapshot()` to
 * `useAgentContext`. For LangChain, serialize `getSystemSnapshot()`
 * into the model context. Commands live in ./system-commands.
 */

export interface WindowSnapshot {
  app: AppId;
  title: string;
  open: true;
  minimized: boolean;
  focused: boolean;
  /** px, relative to the stage's top-left corner */
  x: number;
  y: number;
  /** stacking order — higher is closer to the viewer */
  z: number;
  width: number;
  /** null = window sizes itself to its content */
  height: number | null;
}

export interface AppSnapshot {
  app: AppId;
  title: string;
  description: string;
  open: boolean;
}

export interface SystemSnapshot {
  system: {
    version: string;
    /** the draggable window area, in px */
    stage: StageSize;
    soundMuted: boolean;
    fullscreen: boolean;
  };
  /** every installed app, whether its window is open or not */
  apps: AppSnapshot[];
  /** currently open windows with live geometry */
  windows: WindowSnapshot[];
  /** what the INFO window is currently showing, if anything */
  inspectTarget: InspectTarget | null;
  /** the Player's dossier — identity, stats, CV data */
  player: typeof player;
  quests: typeof quests;
  skills: {
    sets: typeof skillSets;
    categories: { id: string; name: string; set: string }[];
    skills: {
      id: string;
      name: string;
      category: string;
      rarity: string;
      mastery: number;
      lore: string;
      tags?: string[];
    }[];
  };
  chronicle: typeof chronicle;
  achievements: typeof achievements;
  inventory: {
    categories: { id: string; name: string }[];
    items: {
      id: string;
      name: string;
      category: string;
      rarity: string;
      meta?: string;
      lore: string;
      tags?: string[];
      /** USE-ing the item opens this app */
      unlocks?: AppId;
      /** USE-ing the item opens this external URL */
      link?: string;
    }[];
  };
}

/** static part of the snapshot — configs never change at runtime */
const dossier = {
  player,
  quests,
  skills: {
    sets: skillSets,
    categories: skillCategories.map(({ id, name, set }) => ({
      id,
      name,
      set,
    })),
    skills: skills.map(
      ({ id, name, category, rarity, mastery, lore, tags }) => ({
        id,
        name,
        category,
        rarity,
        mastery,
        lore,
        ...(tags ? { tags } : {}),
      }),
    ),
  },
  chronicle,
  achievements,
  inventory: {
    categories: inventoryCategories.map(({ id, name }) => ({ id, name })),
    items: inventoryItems.map(
      ({ id, name, category, rarity, meta, lore, tags, unlocks, link }) => ({
        id,
        name,
        category,
        rarity,
        ...(meta ? { meta } : {}),
        lore,
        ...(tags ? { tags } : {}),
        ...(unlocks ? { unlocks } : {}),
        ...(link ? { link } : {}),
      }),
    ),
  },
} as const;

function buildSnapshot(
  windows: OsWindow[],
  stage: StageSize,
  soundMuted: boolean,
  fullscreen: boolean,
  inspectTarget: InspectTarget | null,
): SystemSnapshot {
  const focusedId = topVisibleWindow(windows)?.id;
  return {
    system: {
      version: systemConfig.version,
      stage,
      soundMuted,
      fullscreen,
    },
    apps: appList.map((def) => ({
      app: def.id,
      title: def.title,
      description: def.description,
      open: windows.some((w) => w.id === def.id),
    })),
    windows: windows.map((w) => ({
      app: w.id,
      title: appList.find((def) => def.id === w.id)?.title ?? w.id,
      open: true,
      minimized: w.minimized,
      focused: w.id === focusedId,
      x: Math.round(w.x),
      y: Math.round(w.y),
      z: w.z,
      width: Math.round(w.width),
      height: w.height == null ? null : Math.round(w.height),
    })),
    inspectTarget,
    ...dossier,
  };
}

/** Imperative snapshot — for tool handlers and non-React callers. */
export function getSystemSnapshot(): SystemSnapshot {
  const { windows, stage, inspectTarget } = useOsStore.getState();
  const { muted } = useSoundStore.getState();
  const fullscreen =
    typeof document !== "undefined" && document.fullscreenElement !== null;
  return buildSnapshot(windows, stage, muted, fullscreen, inspectTarget);
}

/** Reactive snapshot — re-renders as the System changes (V5: feed to useAgentContext). */
export function useSystemSnapshot(): SystemSnapshot {
  const windows = useOsStore((s) => s.windows);
  const stage = useOsStore((s) => s.stage);
  const inspectTarget = useOsStore((s) => s.inspectTarget);
  const muted = useSoundStore((s) => s.muted);
  const fullscreen = useFullscreen();
  return useMemo(
    () => buildSnapshot(windows, stage, muted, fullscreen, inspectTarget),
    [windows, stage, muted, fullscreen, inspectTarget],
  );
}
