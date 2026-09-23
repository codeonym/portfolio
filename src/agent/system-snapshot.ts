import { achievements, chronicle } from "@/config/chronicle.config";
import { inventoryCategories, inventoryItems } from "@/config/inventory.config";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { skillCategories, skillSets, skills } from "@/config/skills.config";
import { systemConfig } from "@/config/system.config";
import type { Destination, InspectTarget, ZoneId } from "@/config/types";
import { visitorQuests, zones } from "@/config/world.config";
import { levelFor, live, useWorldStore } from "@/store/world-store";

/**
 * ── AGENT BRIDGE · READ SIDE ──────────────────────────────────
 * One serializable snapshot of everything an AI agent needs to
 * reason about the world: where the Hunter stands, which zone panel
 * is open, the visitor's progress, and the Player's full dossier.
 * Icons and React types are stripped — every value survives
 * JSON.stringify.
 *
 * CopilotKit v2: pass `useSystemSnapshot()` to `useAgentContext`.
 * LangChain: serialize `getSystemSnapshot()` into the model context.
 */

export interface ZoneSnapshot {
  zone: ZoneId;
  name: string;
  section: string;
  description: string;
  position: [number, number];
  discovered: boolean;
}

export interface SystemSnapshot {
  system: { version: string; soundMuted: boolean; quality: string; touch: boolean };
  world: {
    hunter: { x: number; z: number; moving: boolean };
    /** zone the Hunter stands in, if any */
    nearZone: ZoneId | null;
    /** zone whose panel is open, if any */
    openPanel: ZoneId | null;
    cvOpen: boolean;
    mapOpen: boolean;
    inspectTarget: InspectTarget | null;
    zones: ZoneSnapshot[];
  };
  visitor: {
    level: number;
    xp: number;
    questsCompleted: string[];
    quests: { id: string; name: string; objective: string; done: boolean }[];
    /** quest (project) ids already extracted as shadows */
    shadowsRisen: string[];
  };
  player: typeof player;
  quests: typeof quests;
  skills: {
    sets: typeof skillSets;
    categories: { id: string; name: string; set: string }[];
    skills: { id: string; name: string; category: string; rarity: string; mastery: number; lore: string; tags?: string[] }[];
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
      unlocks?: Destination;
      link?: string;
    }[];
  };
}

/** static part — configs never change at runtime */
const dossier = {
  player,
  quests,
  skills: {
    sets: skillSets,
    categories: skillCategories.map(({ id, name, set }) => ({ id, name, set })),
    skills: skills.map(({ id, name, category, rarity, mastery, lore, tags }) => ({
      id,
      name,
      category,
      rarity,
      mastery,
      lore,
      ...(tags ? { tags } : {}),
    })),
  },
  chronicle,
  achievements,
  inventory: {
    categories: inventoryCategories.map(({ id, name }) => ({ id, name })),
    items: inventoryItems.map(({ id, name, category, rarity, meta, lore, tags, unlocks, link }) => ({
      id,
      name,
      category,
      rarity,
      lore,
      ...(meta ? { meta } : {}),
      ...(tags ? { tags } : {}),
      ...(unlocks ? { unlocks } : {}),
      ...(link ? { link } : {}),
    })),
  },
};

export function getSystemSnapshot(): SystemSnapshot {
  const s = useWorldStore.getState();
  return {
    system: { version: systemConfig.version, soundMuted: s.muted, quality: s.quality, touch: s.touch },
    world: {
      hunter: { x: +live.hunter.x.toFixed(2), z: +live.hunter.z.toFixed(2), moving: live.moving },
      nearZone: s.nearZone,
      openPanel: s.panel,
      cvOpen: s.cvOpen,
      mapOpen: s.mapOpen,
      inspectTarget: s.inspect,
      zones: zones.map((z) => ({
        zone: z.id,
        name: z.name,
        section: z.section,
        description: z.description,
        position: z.position,
        discovered: s.visited.includes(z.id),
      })),
    },
    visitor: {
      level: levelFor(s.xp),
      xp: s.xp,
      questsCompleted: s.completed,
      quests: visitorQuests.map((q) => ({ id: q.id, name: q.name, objective: q.objective, done: s.completed.includes(q.id) })),
      shadowsRisen: s.risen,
    },
    ...dossier,
  };
}

/** reactive variant for `useAgentContext` — re-renders on store changes */
export function useSystemSnapshot(): SystemSnapshot {
  useWorldStore();
  return getSystemSnapshot();
}
