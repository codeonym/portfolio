import type { LucideIcon } from "lucide-react";

export type QuestRank = "S" | "A" | "B";
export type QuestStatus = "cleared" | "ongoing";
export type Tone = "system" | "arcane" | "gold" | "ember";
export type Rarity = "legendary" | "epic" | "rare" | "common";

export interface Stat {
  /** Solo Leveling stat code (STR, INT, ...) */
  code: string;
  /** What the stat actually measures */
  label: string;
  /** 0–100 */
  value: number;
}

export interface PlayerLinks {
  github: string;
  linkedin: string;
  email: string;
}

export interface Player {
  name: string;
  handle: string;
  title: string;
  job: string;
  location: string;
  guild: string;
  level: number;
  profile: string[];
  creed: string;
  stats: Stat[];
  links: PlayerLinks;
  languages: { name: string; grade: string }[];
}

export interface Quest {
  id: string;
  name: string;
  rank: QuestRank;
  type: "main" | "side";
  status: QuestStatus;
  period?: string;
  summary: string;
  details: string[];
  /** tech stack, framed as quest rewards */
  rewards: string[];
  link?: string;
}

export interface Skill {
  name: string;
  /** 0–100 mastery */
  level: number;
}

export interface SkillCategory {
  name: string;
  skills: Skill[];
}

export interface ChronicleEntry {
  id: string;
  role: string;
  organization: string;
  period: string;
  summary: string;
  highlights: string[];
}

export interface Achievement {
  id: string;
  title: string;
  issuer: string;
  period: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: LucideIcon;
  /** must match an InventoryCategory id */
  category: string;
  rarity: Rarity;
  /** 0–100 proficiency, drives the mastery gauge */
  mastery: number;
  /** flavor description shown in the item detail panel */
  lore: string;
  tags?: string[];
}

export interface Vital {
  code: string;
  label: string;
  reading: string;
  /** 0–100 */
  percent: number;
  tone: "ember" | "system";
  icon: LucideIcon;
}

export interface AmbientEvent {
  heading: string;
  body: string;
  tone: Tone;
}

export interface SystemConfig {
  /** shown in the dock footer */
  version: string;
  /** flavor XP % toward next level, 0–100 */
  xpProgress: number;
  /** HP/SP-style gauges (status window + top bar) */
  vitals: Vital[];
  boot: {
    lines: string[];
    notification: {
      heading: string;
      body: string;
      question: string;
      name: string;
      accept: string;
      decline: string;
      /** shown after a DECLINE attempt — the System does not take no */
      declineRejected: string;
    };
    skipLabel: string;
  };
  /** rotating status messages in the top bar */
  ticker: string[];
  /** ambient notification pool — one fires every eventIntervalMs ± jitter */
  ambientEvents: AmbientEvent[];
  /** average ms between ambient notifications */
  eventIntervalMs: number;
  /** synthetic lines for the SYSTEM LOG stream widget */
  logLines: string[];
  /** avatar hologram caption */
  avatarCaption: string;
  dockFooter: string;
  unsupported: {
    error: string;
    heading: string;
    title: string;
    body: string;
    footer: string;
  };
}
