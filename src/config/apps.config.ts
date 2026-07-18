import type { LucideIcon } from "lucide-react";
import {
  Backpack,
  Brain,
  Gauge,
  IdCard,
  Info,
  ScrollText,
  Share2,
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
 *
 * `hidden` windows exist but have no dock entry or hotkey — they
 * open through gameplay (items, inspect actions) or agent commands.
 */
export type AppId =
  | "status"
  | "quests"
  | "skills"
  | "inventory"
  | "chronicle"
  | "network"
  | "cv"
  | "inspect";

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
  /** no dock entry, no hotkey — opened via items/inspect/agents */
  hidden?: boolean;
}

export const apps: Record<AppId, AppDefinition> = {
  status: {
    id: "status",
    title: "STATUS",
    icon: Gauge,
    description:
      "Player identity and overview: portrait, name, job title, rank, titles acquired, level, guild, location, core stats, vitals and profile summary.",
    defaultPosition: { x: 660, y: 50 },
    width: 620,
  },
  quests: {
    id: "quests",
    title: "QUEST LOG",
    icon: Swords,
    description:
      "Main quests (the Player's job/engagements) and side quests (academic and personal projects). Clicking a quest opens its details in the INFO window.",
    defaultPosition: { x: 620, y: 100 },
    width: 560,
  },
  skills: {
    id: "skills",
    title: "SKILLS",
    icon: Brain,
    description:
      "The skill tree in two sets: job skills (the craft — AI, languages, web, data, ops) and secondary skills (tongues, soft skills, pursuits). Clicking a skill opens its details in the INFO window.",
    defaultPosition: { x: 680, y: 70 },
    width: 640,
  },
  inventory: {
    id: "inventory",
    title: "INVENTORY",
    icon: Backpack,
    description:
      "The Player's possessions: artifacts (including the Hunter's License holding the CV), credentials (degrees) and curios. Clicking an item opens its details in the INFO window; some items can be USE-d to open other windows.",
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
  network: {
    id: "network",
    title: "NETWORK",
    icon: Share2,
    description:
      "Contact channels: GitHub, LinkedIn and email — how to reach the Player and form a party.",
    defaultPosition: { x: 720, y: 140 },
    width: 480,
  },
  cv: {
    id: "cv",
    title: "OFFICIAL RECORD",
    icon: IdCard,
    description:
      "The Player's full CV rendered as a PDF with a download option. Opened by USE-ing the Hunter's License item in the INVENTORY.",
    defaultPosition: { x: 560, y: 40 },
    width: 720,
    defaultHeight: 560,
    hidden: true,
  },
  inspect: {
    id: "inspect",
    title: "INFO",
    icon: Info,
    description:
      "Game-style detail popup for whatever was last inspected: a skill, an inventory item or a quest. Retargets when something else is clicked.",
    defaultPosition: { x: 180, y: 120 },
    width: 470,
    hidden: true,
  },
};

export const appList: AppDefinition[] = Object.values(apps);

/** dock + hotkey surface — hidden windows excluded */
export const dockApps: AppDefinition[] = appList.filter((app) => !app.hidden);

export const appIds = appList.map((app) => app.id) as AppId[];

export function isAppId(value: string): value is AppId {
  return value in apps;
}
