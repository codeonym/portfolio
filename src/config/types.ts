import type { LucideIcon } from "lucide-react";
import type { AppId } from "./apps.config";

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

/** honorific earned through deeds — shown as gold chips in STATUS */
export interface PlayerTitle {
  id: string;
  name: string;
  /** the deed behind the title, one line */
  description: string;
}

export interface Player {
  name: string;
  handle: string;
  title: string;
  job: string;
  location: string;
  guild: string;
  level: number;
  /** hunter rank letter (S/A/B...) shown beside the level */
  rank: string;
  /** flavor line under the rank (e.g. next assessment) */
  rankNote: string;
  titles: PlayerTitle[];
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

/** job = the Player's craft; secondary = everything the job isn't */
export type SkillSet = "job" | "secondary";

export interface SkillSetDef {
  id: SkillSet;
  name: string;
  /** one-line intro rendered under the set heading */
  blurb: string;
}

export interface SkillCategoryDef {
  id: string;
  name: string;
  icon: LucideIcon;
  set: SkillSet;
  tone: Tone;
}

export interface SkillDetail {
  id: string;
  name: string;
  icon: LucideIcon;
  /** must match a SkillCategoryDef id */
  category: string;
  rarity: Rarity;
  /** 0–100 mastery, drives the gauge and grade */
  mastery: number;
  /** flavor description shown in the INFO window */
  lore: string;
  tags?: string[];
}

/** what the singleton INFO window is currently showing */
export interface InspectTarget {
  kind: "skill" | "item" | "quest";
  id: string;
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
  /** provenance line (issuer · period) shown under the item name */
  meta?: string;
  /** flavor description shown in the INFO window */
  lore: string;
  tags?: string[];
  /** USE-ing this item opens the given System window (e.g. the CV) */
  unlocks?: AppId;
  /** USE-ing this item opens an external destination */
  link?: string;
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
  unsupported: SystemScreenCopy;
  runtimeError: SystemScreenCopy & { retry: string };
  notFound: SystemScreenCopy & { cta: string };
}

/** Copy for a full-viewport System interrupt screen (device gate, crash, 404). */
export interface SystemScreenCopy {
  error: string;
  heading: string;
  title: string;
  body: string;
  footer: string;
}
