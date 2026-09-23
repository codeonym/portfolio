import { findItem, inventoryItems } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import type { ZoneId } from "@/config/types";
import { isZoneId, zoneById, zoneIds } from "@/config/world.config";
import { levelFor, useWorldStore, type Quality } from "@/store/world-store";

/**
 * ── AGENT BRIDGE · WRITE SIDE ─────────────────────────────────
 * Every way an AI agent may drive the world, as a flat registry:
 * name, model-facing description, JSON-Schema parameters and a
 * handler returning a human-readable tool result.
 *
 * Framework-neutral by design: LangChain tools take JSON Schema
 * directly; CopilotKit v2 `useFrontendTool` needs one zod adapter
 * per entry. New zones need zero work — commands read zone ids from
 * world.config.
 */

export interface SystemCommand {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
  handler: (args: Record<string, unknown>) => string;
}

const ZONE_ENUM = {
  type: "string",
  enum: zoneIds,
  description:
    "Zone id: awakening (status/profile), guild (experience/education), crypt (projects), armory (skills), treasury (inventory/CV), gate (contact).",
} as const;

const store = () => useWorldStore.getState();
const badZone = (v: unknown) => `Unknown zone "${String(v)}". Valid zones: ${zoneIds.join(", ")}.`;
const zoneArg = (args: Record<string, unknown>): ZoneId | null =>
  typeof args.zone === "string" && isZoneId(args.zone) ? args.zone : null;

export const systemCommands: SystemCommand[] = [
  {
    name: "open_zone",
    description:
      "Show a section of the portfolio: the Hunter fast-travels to the zone and its panel opens, with the camera framing the landmark.",
    parameters: { type: "object", properties: { zone: ZONE_ENUM }, required: ["zone"], additionalProperties: false },
    handler: (args) => {
      const zone = zoneArg(args);
      if (!zone) return badZone(args.zone);
      store().travelTo(zone);
      // let the warp land before the panel frames the landmark
      window.setTimeout(() => store().openPanel(zone), 450);
      return `Opened ${zoneById[zone].name} (${zoneById[zone].section}).`;
    },
  },
  {
    name: "walk_to_zone",
    description: "Make the Hunter walk (not teleport) to a zone; its panel opens on arrival.",
    parameters: { type: "object", properties: { zone: ZONE_ENUM }, required: ["zone"], additionalProperties: false },
    handler: (args) => {
      const zone = zoneArg(args);
      if (!zone) return badZone(args.zone);
      store().goTo(zone);
      return `The Hunter is walking to ${zoneById[zone].name}.`;
    },
  },
  {
    name: "close_panel",
    description: "Close the open zone panel and any inspect card, returning the camera to the Hunter.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    handler: () => {
      store().closePanel();
      return "Panel closed.";
    },
  },
  {
    name: "inspect_entity",
    description: "Open the detail card for a skill, inventory item, or quest (project) by id.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["skill", "item", "quest"] },
        id: { type: "string", description: "Entity id from the snapshot (skills.skills, inventory.items, quests)." },
      },
      required: ["kind", "id"],
      additionalProperties: false,
    },
    handler: (args) => {
      const kind = args.kind;
      const id = String(args.id ?? "");
      const exists =
        kind === "skill" ? !!findSkill(id) : kind === "item" ? !!findItem(id) : kind === "quest" ? quests.some((q) => q.id === id) : false;
      if (!exists) {
        const pool = kind === "skill" ? skills : kind === "item" ? inventoryItems : quests;
        return `No ${String(kind)} "${id}". Try one of: ${pool.map((e) => e.id).slice(0, 12).join(", ")}…`;
      }
      store().setInspect({ kind: kind as "skill" | "item" | "quest", id });
      return `Inspecting ${String(kind)} "${id}".`;
    },
  },
  {
    name: "arise",
    description:
      "Command a fallen quest (project) in the Shadow Crypt to ARISE — it plays the extraction and joins the Hunter's shadow legion. Omit id to raise the next fallen one.",
    parameters: {
      type: "object",
      properties: { id: { type: "string", enum: quests.map((q) => q.id) } },
      additionalProperties: false,
    },
    handler: (args) => {
      const s = store();
      if (s.rising) return `Another shadow is mid-extraction (${s.rising}); try again in a few seconds.`;
      const id = typeof args.id === "string" ? args.id : quests.find((q) => !s.risen.includes(q.id))?.id;
      if (!id) return "Every quest has already risen.";
      if (s.risen.includes(id)) return `"${id}" has already risen.`;
      s.arise(id);
      return `ARISE — "${id}" is being extracted.`;
    },
  },
  {
    name: "open_cv",
    description: "Project the Hunter's License: open the full CV (PDF) viewer with a download option.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    handler: () => {
      store().setCvOpen(true);
      return "CV viewer open.";
    },
  },
  {
    name: "toggle_map",
    description: "Open or close the world map (fast-travel overlay).",
    parameters: { type: "object", properties: { open: { type: "boolean" } }, required: ["open"], additionalProperties: false },
    handler: (args) => {
      store().setMapOpen(!!args.open);
      return `World map ${args.open ? "open" : "closed"}.`;
    },
  },
  {
    name: "set_sound",
    description: "Mute or unmute all world audio.",
    parameters: { type: "object", properties: { muted: { type: "boolean" } }, required: ["muted"], additionalProperties: false },
    handler: (args) => {
      if (store().muted !== !!args.muted) store().toggleMuted();
      return `Sound ${args.muted ? "muted" : "on"}.`;
    },
  },
  {
    name: "set_quality",
    description: "Change graphics quality: high (shadows + bloom), medium (bloom), low (no post-processing).",
    parameters: {
      type: "object",
      properties: { quality: { type: "string", enum: ["high", "medium", "low"] } },
      required: ["quality"],
      additionalProperties: false,
    },
    handler: (args) => {
      const q = args.quality as Quality;
      if (!["high", "medium", "low"].includes(q)) return `Unknown quality "${String(q)}".`;
      store().setQuality(q);
      return `Graphics quality set to ${q}.`;
    },
  },
  {
    name: "visitor_progress",
    description: "Report the visitor's level, XP, discovered zones and completed System quests.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
    handler: () => {
      const s = store();
      return `Visitor LV.${levelFor(s.xp)} (${s.xp} XP). Zones discovered: ${s.visited.join(", ") || "none"}. Quests done: ${s.completed.join(", ") || "none"}. Shadows risen: ${s.risen.length}/${quests.length}.`;
    },
  },
];

export function executeSystemCommand(name: string, args: Record<string, unknown> = {}): string {
  const cmd = systemCommands.find((c) => c.name === name);
  if (!cmd) return `Unknown command "${name}". Available: ${systemCommands.map((c) => c.name).join(", ")}.`;
  try {
    return cmd.handler(args);
  } catch (err) {
    return `Command "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}
