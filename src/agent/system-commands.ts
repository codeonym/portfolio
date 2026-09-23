import { z } from "zod";
import { findItem, inventoryItems } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import type { Tone, ZoneId } from "@/config/types";
import { zoneById, zoneIds } from "@/config/world.config";
import { addShake, kickAberration } from "@/components/world/follow-camera";
import { chime, play } from "@/lib/audio";
import { levelFor, useWorldStore, type Quality } from "@/store/world-store";

/**
 * ── AGENT BRIDGE · WRITE SIDE ─────────────────────────────────
 * Every way an AI agent may drive the world, as a flat registry:
 * name, model-facing description, a zod schema and a handler that
 * returns a human-readable tool result.
 *
 * The same entries become CopilotKit v2 frontend tools
 * (`useFrontendTool`, see `components/agent/system-tools.tsx`) and
 * the `window.system.run(...)` console bridge. New zones need zero
 * work — schemas read zone ids from world.config.
 */

export interface SystemCommand<S extends z.ZodObject = z.ZodObject> {
  name: string;
  description: string;
  parameters: S;
  handler: (args: z.infer<S>) => string;
}

const define = <S extends z.ZodObject>(cmd: SystemCommand<S>) => cmd as unknown as SystemCommand;

const ZONE = z
  .enum(zoneIds as [ZoneId, ...ZoneId[]])
  .describe(
    "System window / zone id: awakening = STATUS window (profile, stats, titles), guild = experience & education, crypt = projects (quests), armory = skills, treasury = inventory & CV, gate = contact.",
  );

const store = () => useWorldStore.getState();

export const systemCommands: SystemCommand[] = [
  define({
    name: "open_zone",
    description:
      "Open a System window (tab) — e.g. 'show me the status window' → awakening. The Hunter fast-travels to the zone, its window opens and the camera frames the landmark.",
    parameters: z.object({ zone: ZONE }),
    handler: ({ zone }) => {
      store().travelTo(zone);
      // let the warp land before the panel frames the landmark
      window.setTimeout(() => store().openPanel(zone), 450);
      return `Opened ${zoneById[zone].name} (${zoneById[zone].section}). The visitor can read it — do not recite its contents; one or two lines on what matters.`;
    },
  }),
  define({
    name: "walk_to_zone",
    description: "Make the Hunter walk (not teleport) to a zone; its window opens on arrival. Slower and more cinematic than open_zone.",
    parameters: z.object({ zone: ZONE }),
    handler: ({ zone }) => {
      store().goTo(zone);
      return `The Hunter is walking to ${zoneById[zone].name}.`;
    },
  }),
  define({
    name: "close_windows",
    description: "Close every open System window: the zone panel, inspect card, world map and CV viewer.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      s.closePanel();
      s.setMapOpen(false);
      s.setCvOpen(false);
      return "All windows closed.";
    },
  }),
  define({
    name: "inspect_entity",
    description: "Open the detail card for one skill, inventory item or quest (project) by its id from the dossier.",
    parameters: z.object({
      kind: z.enum(["skill", "item", "quest"]),
      id: z.string().describe("Entity id, e.g. a skill id like 'langgraph', an item id like 'hunter-license', a quest id like 'pharma-mas'."),
    }),
    handler: ({ kind, id }) => {
      const exists = kind === "skill" ? !!findSkill(id) : kind === "item" ? !!findItem(id) : quests.some((q) => q.id === id);
      if (!exists) {
        const pool = kind === "skill" ? skills : kind === "item" ? inventoryItems : quests;
        return `No ${kind} "${id}". Valid ids: ${pool.map((e) => e.id).join(", ")}.`;
      }
      store().setInspect({ kind, id });
      return `Inspecting ${kind} "${id}".`;
    },
  }),
  define({
    name: "arise",
    description:
      "Command a fallen quest (project) in the Shadow Crypt to ARISE: it plays the extraction and joins the Hunter's shadow legion. Omit id to raise the next fallen one. One at a time — each extraction takes a few seconds.",
    parameters: z.object({ id: z.enum(quests.map((q) => q.id) as [string, ...string[]]).optional() }),
    handler: ({ id }) => {
      const s = store();
      if (s.rising) return `Another shadow is mid-extraction (${s.rising}); try again in a few seconds.`;
      const target = id ?? quests.find((q) => !s.risen.includes(q.id))?.id;
      if (!target) return "Every quest has already risen.";
      if (s.risen.includes(target)) return `"${target}" has already risen.`;
      if (s.panel !== "crypt") {
        s.travelTo("crypt");
        window.setTimeout(() => store().openPanel("crypt"), 450);
      }
      window.setTimeout(() => store().arise(target), s.panel === "crypt" ? 0 : 1300);
      return `ARISE — "${target}" is being extracted in the Shadow Crypt.`;
    },
  }),
  define({
    name: "open_cv",
    description: "Project the Hunter's License: open the full CV (PDF) viewer with a download option.",
    parameters: z.object({}),
    handler: () => {
      store().setCvOpen(true);
      return "CV viewer open.";
    },
  }),
  define({
    name: "toggle_map",
    description: "Open or close the world map (fast-travel overlay).",
    parameters: z.object({ open: z.boolean() }),
    handler: ({ open }) => {
      store().setMapOpen(open);
      return `World map ${open ? "open" : "closed"}.`;
    },
  }),
  define({
    name: "set_sound",
    description: "Mute or unmute all world audio.",
    parameters: z.object({ muted: z.boolean() }),
    handler: ({ muted }) => {
      if (store().muted !== muted) store().toggleMuted();
      return `Sound ${muted ? "muted" : "on"}.`;
    },
  }),
  define({
    name: "set_quality",
    description: "Change graphics quality: high (shadows + bloom), medium (bloom), low (no post-processing — use when the visitor says it is slow).",
    parameters: z.object({ quality: z.enum(["high", "medium", "low"]) }),
    handler: ({ quality }) => {
      store().setQuality(quality as Quality);
      return `Graphics quality set to ${quality}.`;
    },
  }),
  define({
    name: "system_notification",
    description:
      "Push a System notification toast (with the System chime) onto the visitor's HUD — for quest hints, warnings, flavor announcements. Keep heading ≤ 4 words, body ≤ 140 chars.",
    parameters: z.object({
      heading: z.string().describe("Short uppercase heading, e.g. 'HIDDEN QUEST'"),
      body: z.string(),
      tone: z.enum(["system", "arcane", "gold", "ember"]).optional().describe("system=blue info, arcane=purple mystic, gold=reward, ember=warning"),
    }),
    handler: ({ heading, body, tone }) => {
      store().pushToast({ heading: heading.toUpperCase().slice(0, 40), body: body.slice(0, 200), tone: (tone ?? "system") as Tone });
      return "Notification delivered.";
    },
  }),
  define({
    name: "cast_effect",
    description:
      "Play a cinematic world effect for dramatic moments: tremor (camera shake), surge (mana surge — lens aberration + portal hum), awaken (both, with the ARISE roar).",
    parameters: z.object({ effect: z.enum(["tremor", "surge", "awaken"]) }),
    handler: ({ effect }) => {
      if (effect !== "surge") addShake(effect === "awaken" ? 0.9 : 0.6);
      if (effect !== "tremor") kickAberration(effect === "awaken" ? 1.6 : 1);
      play(effect === "awaken" ? "arise" : effect === "surge" ? "portal" : "blade");
      if (effect === "awaken") chime();
      return `Effect "${effect}" cast.`;
    },
  }),
  define({
    name: "visitor_progress",
    description: "Report the visitor's level, XP, discovered zones, completed System quests and risen shadows.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      return `Visitor LV.${levelFor(s.xp)} (${s.xp} XP). Zones discovered: ${s.visited.join(", ") || "none"}. Quests done: ${s.completed.join(", ") || "none"}. Shadows risen: ${s.risen.length}/${quests.length}.`;
    },
  }),
];

export function executeSystemCommand(name: string, args: Record<string, unknown> = {}): string {
  const cmd = systemCommands.find((c) => c.name === name);
  if (!cmd) return `Unknown command "${name}". Available: ${systemCommands.map((c) => c.name).join(", ")}.`;
  const parsed = cmd.parameters.safeParse(args ?? {});
  if (!parsed.success) {
    return `Invalid arguments for "${name}": ${parsed.error.issues.map((i) => `${i.path.join(".") || "args"} ${i.message}`).join("; ")}`;
  }
  try {
    return cmd.handler(parsed.data);
  } catch (err) {
    return `Command "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}
