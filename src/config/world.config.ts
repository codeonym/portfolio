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
 * The Double Dungeon: one temple hall the Hunter walks, from the Shadow
 * Gate at the south door up the nave to THE SYSTEM's throne. Each zone
 * is a station in the hall that opens one section of the portfolio.
 * Positions are world units ([x, z]): the hall spans `world.hall`, the
 * Hunter is ~2.2 units tall, and -z is "north" (toward the throne).
 *
 * Moving a zone moves its station, marker, minimap pin and trigger.
 */
export const zones: ZoneDef[] = [
  {
    id: "awakening",
    name: "Awakening Circle",
    section: "Status & Profile",
    epithet: "where the Player first heard the System",
    icon: Gauge,
    tone: "system",
    position: [0, -8.8],
    approach: [0, -4.4],
    radius: 4.6,
    verb: "Read",
    description:
      "The throne at the head of the hall. Player identity: name, job, rank, level, titles, core stats, profile, creed and languages.",
  },
  {
    id: "guild",
    name: "Guild Hall",
    section: "Experience & Education",
    epithet: "every contract the Player has signed",
    icon: Landmark,
    tone: "gold",
    position: [6.4, 24.4],
    approach: [4.4, 23.2],
    radius: 2.6,
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
    position: [0, 11.5],
    approach: [0, 11.5],
    radius: 6,
    verb: "Descend into",
    description:
      "Projects, framed as fallen soldiers. Each fallen knight is one quest (project); commanding ARISE extracts it as a shadow and reveals the project details.",
  },
  {
    id: "armory",
    name: "Armory",
    section: "Skills",
    epithet: "the arsenal of a job-class awakened",
    icon: Swords,
    tone: "ember",
    position: [-6.3, -2.6],
    approach: [-4.3, -1.8],
    radius: 2.6,
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
    position: [-6.2, 24.4],
    approach: [-4.3, 23.2],
    radius: 2.6,
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
    position: [0, 28.4],
    approach: [0, 25.6],
    radius: 3,
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
    objective: "Discover every station in the temple",
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
  /** the walkable floor of the hall (world units): |x| ≤ halfWidth, north ≤ z ≤ south */
  hall: { halfWidth: 8.1, north: -19.4, south: 27.2 },
  /** where the Hunter steps out of the Gate, [x, z] */
  spawn: [0, 21.6] as [number, number],
  /** walking / running speeds in units per second */
  walkSpeed: 2.4,
  runSpeed: 6,

  loading: {
    heading: "SYSTEM",
    lines: [
      "Scanning for a compatible vessel…",
      "Tearing open a Gate…",
      "Unsealing the Double Dungeon…",
      "Kneeling the fallen knights…",
      "Lighting the torches…",
      "Syncing the Player record…",
    ],
    tips: [
      "Click anywhere on the ground to walk there. Hold SHIFT to run.",
      "WASD or the arrow keys move the Hunter. Drag to turn the camera.",
      "Every kneeling knight in the nave is a project. Command it to ARISE.",
      "Risen shadows follow the Hunter everywhere.",
      "Press M to open the temple map and fast-travel to any station.",
      "The giant wraith above the throne is THE SYSTEM. Press T and ask it anything — it can open any window for you.",
    ],
  },

  title: {
    eyebrow: "[ A NEW PLAYER HAS BEEN DETECTED ]",
    name: "CODEONYM",
    role: "Software Engineer · AI Agent Engineer",
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
    mapLabel: "TEMPLE MAP",
    mapHint: "select a station to fast-travel",
    promptKey: "E",
    tapPrompt: "TAP",
    arise: "ARISE",
    ariseAll: "ARISE — ALL",
    controlsDesktop: "CLICK · WASD move — SHIFT run — DRAG look — M map — E interact — T speak — hold V talk — F fullscreen",
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

  /** THE SYSTEM — the agent embodied by the wraith above the Awakening Circle */
  agent: {
    name: "THE SYSTEM",
    epithet: "the entity that chose the Player",
    /** the HUD prompt shown when the Hunter stands at the Awakening Circle */
    promptVerb: "Speak with",
    promptKey: "T",
    greeting:
      "[ You have been noticed, Hunter. ] Ask me anything about the Player — or tell me what to show you. I can open any System window, raise the fallen, and bend this temple to your request.",
    placeholder: "Speak to the System…",
    thinking: "The System is processing…",
    suggestions: [
      "Show me the status window",
      "Who is the Player?",
      "What has he built with agents?",
      "Raise a shadow for me",
      "How do I contact him?",
    ],
    offline: "The System is unreachable. The link to the Gate will return shortly.",
    footer: "AI · LangChain agent via CopilotKit — answers can be wrong; the CV is the source of truth.",
    /** hold-to-talk: the System's voice (a second agent that delegates to this one) */
    voice: {
      key: "V",
      hold: "Hold to speak",
      listening: "LISTENING",
      decoding: "DECODING VOICE",
      thinking: "THE SYSTEM CONSIDERS",
      speaking: "THE SYSTEM SPEAKS",
      nothingHeard: "The System heard only silence. Hold the key while you speak.",
      micBlocked: "The System cannot hear you — allow the microphone for this site.",
      unsupported: "This browser cannot record your voice.",
      muted: "Sound is off — the System answers in captions.",
      tasks: "DELEGATED TASKS",
    },
  },

  credits:
    "Temple: Throne Room by Uğur Yakışık · Sung Jin-Woo by bgang0892 (Sketchfab Standard) · Igris's sword & plume by missafe · Shadow Wraith by patromes · Lectern by ambrosia04 · Chest by Theo Kain · Coins by SebastianSosnowski · Sword of the Defeated by Bunny-HungTD (Sketchfab, CC BY 4.0) · Knights & motion capture: Mixamo · Sounds: Kenney (CC0)",
};
