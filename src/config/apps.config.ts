import type { LucideIcon } from "lucide-react";
import {
  Backpack,
  Brain,
  Gauge,
  IdCard,
  SatelliteDish,
  ScrollText,
  Swords,
} from "lucide-react";

/**
 * ── APP REGISTRY ──────────────────────────────────────────────
 * One entry per System window: dock label, icon, default position
 * and width. Positions assume a ≥1280px stage; the window manager
 * clamps them on smaller screens.
 *
 * `description` is written for AI agents as much as for humans —
 * it is exposed through the agent bridge (src/agent) so an agent
 * can decide which window answers a visitor's question.
 */
export type AppId =
  | "status"
  | "quests"
  | "skills"
  | "inventory"
  | "chronicle"
  | "summon"
  | "cv";

export interface AppDefinition {
  id: AppId;
  title: string;
  icon: LucideIcon;
  /** what lives inside the window — agent-facing routing hint */
  description: string;
  defaultPosition: { x: number; y: number };
  /** window width in px */
  width: number;
  /** fixed content height in px; omit to size to content */
  defaultHeight?: number;
}

export const apps: Record<AppId, AppDefinition> = {
  status: {
    id: "status",
    title: "STATUS",
    icon: Gauge,
    description:
      "Player identity and overview: name, title, level, guild, location, core stats, vitals and profile summary.",
    defaultPosition: { x: 660, y: 50 },
    width: 620,
  },
  quests: {
    id: "quests",
    title: "QUEST LOG",
    icon: Swords,
    description:
      "Projects framed as quests: rank, status, summary, details and the tech stack earned as rewards.",
    defaultPosition: { x: 620, y: 100 },
    width: 560,
  },
  skills: {
    id: "skills",
    title: "SKILLS",
    icon: Brain,
    description:
      "Skill tree grouped by category with 0-100 mastery per skill.",
    defaultPosition: { x: 680, y: 70 },
    width: 640,
  },
  inventory: {
    id: "inventory",
    title: "INVENTORY",
    icon: Backpack,
    description:
      "The tech stack as game items with rarity and mastery, plus artifacts such as the Hunter's License (the CV).",
    defaultPosition: { x: 600, y: 60 },
    width: 680,
  },
  chronicle: {
    id: "chronicle",
    title: "CHRONICLE",
    icon: ScrollText,
    description:
      "Work experience timeline and achievements/certifications.",
    defaultPosition: { x: 640, y: 80 },
    width: 600,
  },
  summon: {
    id: "summon",
    title: "SUMMON",
    icon: SatelliteDish,
    description:
      "Contact channels: GitHub, LinkedIn and email — how to reach the Player.",
    defaultPosition: { x: 720, y: 140 },
    width: 480,
  },
  cv: {
    id: "cv",
    title: "DOSSIER",
    icon: IdCard,
    description:
      "The official record: the Player's full CV rendered as a PDF, with a download option.",
    defaultPosition: { x: 560, y: 40 },
    width: 720,
    defaultHeight: 560,
  },
};

export const appList: AppDefinition[] = Object.values(apps);

export const appIds = appList.map((app) => app.id) as AppId[];

export function isAppId(value: string): value is AppId {
  return value in apps;
}
