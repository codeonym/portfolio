import {
  Backpack,
  DoorOpen,
  Gauge,
  Landmark,
  Skull,
  Swords,
} from "lucide-react";
import type { VisitorQuest, ZoneDef, ZoneId } from "./types";

/**
 * ── THE WORLD ─────────────────────────────────────────────────
 * The island the Hunter walks. Each zone is a landmark that opens
 * one section of the portfolio. Positions are world units ([x, z]):
 * the island is a disc of radius `world.islandRadius`, the Hunter is
 * ~2.2 units tall, and -z is "north" (away from the spawn camera).
 *
 * Moving a zone moves its landmark, marker, minimap pin and trigger.
 */
export const zones: ZoneDef[] = [
  {
    id: "awakening",
    name: "Awakening Circle",
    section: "Status & Profile",
    epithet: "where the Player first heard the System",
    icon: Gauge,
    tone: "system",
    position: [0, -2],
    radius: 5.5,
    verb: "Read",
    description:
      "Center of the island. Player identity: name, job, rank, level, titles, core stats, profile, creed and languages.",
  },
  {
    id: "guild",
    name: "Guild Hall",
    section: "Experience & Education",
    epithet: "every contract the Player has signed",
    icon: Landmark,
    tone: "gold",
    position: [-17, -11],
    radius: 6.5,
    verb: "Enter",
    description:
      "Work experience timeline (OpenSNZ-Technology engagements) and education/achievements.",
  },
  {
    id: "crypt",
    name: "Shadow Crypt",
    section: "Projects",
    epithet: "fallen quests, waiting for a command",
    icon: Skull,
    tone: "arcane",
    position: [17, -11],
    radius: 7.5,
    verb: "Descend into",
    description:
      "Projects, framed as fallen soldiers. Each skeleton is one quest (project); commanding ARISE extracts it as a shadow and reveals the project details.",
  },
  {
    id: "armory",
    name: "Armory",
    section: "Skills",
    epithet: "the arsenal of a job-class awakened",
    icon: Swords,
    tone: "ember",
    position: [-16, 11],
    radius: 6.5,
    verb: "Enter",
    description:
      "The skill tree: job skills (AI, agent stack, languages, web, databases, ops) and secondary skills (languages spoken, soft skills, pursuits), each with a mastery grade.",
  },
  {
    id: "treasury",
    name: "Treasury",
    section: "Inventory & CV",
    epithet: "relics, credentials, and the Hunter's License",
    icon: Backpack,
    tone: "gold",
    position: [16, 11],
    radius: 6,
    verb: "Open",
    description:
      "Possessions: artifacts (the Hunter's License holds the full CV), credentials (degrees) and curios.",
  },
  {
    id: "gate",
    name: "Shadow Gate",
    section: "Contact",
    epithet: "step through to reach the Player",
    icon: DoorOpen,
    tone: "arcane",
    position: [0, -25],
    radius: 7,
    verb: "Approach",
    description:
      "Contact channels — GitHub, LinkedIn and email. How to reach the Player and form a party.",
  },
];

export const zoneById = Object.fromEntries(zones.map((z) => [z.id, z])) as Record<
  ZoneId,
  ZoneDef
>;

export const zoneIds = zones.map((z) => z.id);

export function isZoneId(value: string): value is ZoneId {
  return value in zoneById;
}

/** visitor objectives, tracked in the HUD and persisted per browser */
export const visitorQuests: VisitorQuest[] = [
  {
    id: "awaken",
    name: "Awakening",
    objective: "Enter the System",
    xp: 100,
  },
  {
    id: "explore",
    name: "Cartographer",
    objective: "Discover every zone on the island",
    xp: 300,
  },
  {
    id: "arise",
    name: "Shadow Extraction",
    objective: "Command every fallen quest to ARISE",
    xp: 400,
  },
  {
    id: "license",
    name: "Credentials Check",
    objective: "Inspect the Hunter's License",
    xp: 150,
  },
  {
    id: "party",
    name: "Form a Party",
    objective: "Reach the Shadow Gate",
    xp: 150,
  },
];

/** XP needed to go from level n to n+1 */
export const xpPerLevel = 250;

export const world = {
  islandRadius: 31,
  /** where the Hunter materializes, [x, z] */
  spawn: [0, 12] as [number, number],
  /** walking / running speeds in units per second */
  walkSpeed: 4.2,
  runSpeed: 8.5,

  loading: {
    heading: "SYSTEM",
    lines: [
      "Scanning for a compatible vessel…",
      "Tearing open a Gate…",
      "Raising the island from the void…",
      "Waking the fallen…",
      "Lighting the torches…",
      "Syncing the Player record…",
    ],
    tips: [
      "Click anywhere on the ground to walk there. Hold SHIFT to run.",
      "WASD or the arrow keys move the Hunter. Drag to turn the camera.",
      "Every skeleton in the Shadow Crypt is a project. Command it to ARISE.",
      "Risen shadows follow the Hunter everywhere.",
      "Press M to open the world map and fast-travel to any zone.",
    ],
  },

  title: {
    eyebrow: "[ A NEW PLAYER HAS BEEN DETECTED ]",
    name: "CODEONYM",
    role: "AI Software Engineer · Agentic Systems",
    notice:
      "You have acquired the qualifications to enter the domain of the Player. Will you accept?",
    enter: "ARISE",
    enterHint: "sound on · press ENTER",
    lite: "enter without sound",
  },

  hud: {
    visitorLabel: "VISITOR",
    syncLabel: "SYNC",
    questsLabel: "SYSTEM QUESTS",
    mapLabel: "WORLD MAP",
    mapHint: "select a zone to fast-travel",
    promptKey: "E",
    tapPrompt: "TAP",
    arise: "ARISE",
    ariseAll: "ARISE — ALL",
    controlsDesktop: "CLICK · WASD move — SHIFT run — DRAG look — M map — E interact",
    controlsTouch: "TAP to move — STICK to steer — TAP a marker to interact",
  },

  toasts: {
    zoneDiscovered: "ZONE DISCOVERED",
    questComplete: "QUEST COMPLETE",
    levelUp: "LEVEL UP",
    arise: "ARISE",
    ariseBody: "has joined the Shadow Legion.",
    allComplete:
      "Every record unlocked. The Player would be glad to hear from you — the Shadow Gate is open.",
  },

  credits:
    "Models: KayKit by Kay Lousberg (CC0) · HDRI & textures: Poly Haven (CC0) · Sounds: Kenney (CC0)",
};
