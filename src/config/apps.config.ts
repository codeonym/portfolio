import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Gauge,
  SatelliteDish,
  ScrollText,
  Swords,
} from "lucide-react";

/**
 * ── APP REGISTRY ──────────────────────────────────────────────
 * One entry per System window: dock label, icon, default position
 * and width. Positions assume a ≥1280px stage; the window manager
 * clamps them on smaller screens.
 */
export type AppId =
  | "status"
  | "quests"
  | "skills"
  | "chronicle"
  | "summon";

export interface AppDefinition {
  id: AppId;
  title: string;
  icon: LucideIcon;
  defaultPosition: { x: number; y: number };
  /** window width in px */
  width: number;
}

export const apps: Record<AppId, AppDefinition> = {
  status: {
    id: "status",
    title: "STATUS",
    icon: Gauge,
    defaultPosition: { x: 660, y: 50 },
    width: 620,
  },
  quests: {
    id: "quests",
    title: "QUEST LOG",
    icon: Swords,
    defaultPosition: { x: 620, y: 100 },
    width: 560,
  },
  skills: {
    id: "skills",
    title: "SKILLS",
    icon: Brain,
    defaultPosition: { x: 680, y: 70 },
    width: 640,
  },
  chronicle: {
    id: "chronicle",
    title: "CHRONICLE",
    icon: ScrollText,
    defaultPosition: { x: 640, y: 80 },
    width: 600,
  },
  summon: {
    id: "summon",
    title: "SUMMON",
    icon: SatelliteDish,
    defaultPosition: { x: 720, y: 140 },
    width: 480,
  },
};

export const appList: AppDefinition[] = Object.values(apps);
