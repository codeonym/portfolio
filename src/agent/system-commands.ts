import { z } from "zod";
import { player } from "@/config/player.config";
import { findItem, inventoryItems } from "@/config/inventory.config";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import type { Tone, ZoneId } from "@/config/types";
import { zoneById, zoneIds } from "@/config/world.config";
import { setImmersion } from "@/components/hud/immersion";
import { addShake, kickAberration } from "@/components/world/follow-camera";
import { chime, play } from "@/lib/audio";
import { levelFor, useWorldStore, type Quality } from "@/store/world-store";
import { CHANNELS, channelTarget, snapshotFileName } from "./automation";

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
  handler: (args: z.infer<S>) => string | Promise<string>;
}

const define = <S extends z.ZodObject>(cmd: SystemCommand<S>) => cmd as unknown as SystemCommand;

const ZONE = z
  .enum(zoneIds as [ZoneId, ...ZoneId[]])
  .describe(
    "System window / zone id: awakening = STATUS window (profile, stats, titles), guild = experience & education, crypt = projects (quests), armory = skills, treasury = inventory & CV, gate = contact.",
  );

const store = () => useWorldStore.getState();

const CV_URL = "/cv.pdf";
const CV_FILE = "bouarour-ayoub-cv.pdf";

/** a same-origin download — allowed without a user gesture */
function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * The 3D view as a PNG. Read inside the next animation frame, after
 * the renderer has drawn it (the WebGL buffer is not preserved).
 */
function captureCanvas(): Promise<Blob | null> {
  const canvas = document.querySelector("canvas");
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => requestAnimationFrame(() => canvas.toBlob(resolve, "image/png")));
}

/** a rise that has not finished by now has stalled (e.g. a hidden tab stops the render loop) */
const RISE_STALL_MS = 15_000;

/** raise every fallen shadow, one after another; resolves with how many rose */
function ariseAll(): Promise<number> {
  const fallen = () => quests.filter((q) => !store().risen.includes(q.id));
  const before = store().risen.length;
  return new Promise((resolve) => {
    let timer = 0;
    let stall = 0;
    const finish = () => {
      unsubscribe();
      window.clearTimeout(timer);
      window.clearTimeout(stall);
      resolve(store().risen.length - before);
    };
    const step = () => {
      window.clearTimeout(stall);
      stall = window.setTimeout(finish, RISE_STALL_MS);
      if (store().rising) return;
      const next = fallen()[0];
      if (!next) return finish();
      window.clearTimeout(timer);
      timer = window.setTimeout(() => store().arise(next.id), 350);
    };
    const unsubscribe = useWorldStore.subscribe((s, prev) => {
      if (prev.rising && !s.rising) step();
    });
    step();
  });
}

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
    name: "download_cv",
    description:
      "Download the Hunter's License — the Player's CV as a PDF file — straight to the visitor's device. Use when they want to download, save or get the CV / resume / hunter card.",
    parameters: z.object({}),
    handler: () => {
      download(CV_URL, CV_FILE);
      store().completeQuest("license");
      return `Download of ${CV_FILE} started on the visitor's device.`;
    },
  }),
  define({
    name: "copy_contact",
    description: "Copy one of the Player's channels (email address, GitHub, LinkedIn) or this portfolio's link to the visitor's clipboard.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: async ({ channel }) => {
      const { label, text } = channelTarget(channel, player.links, window.location.origin);
      try {
        await navigator.clipboard.writeText(text);
        store().pushToast({ heading: "COPIED", body: `${label} → clipboard`, tone: "system" });
        return `Copied the ${label} to the visitor's clipboard.`;
      } catch {
        store().pushToast({ heading: label.toUpperCase(), body: text, tone: "system" });
        return `The browser blocked the clipboard, so the ${label} is shown in a notification instead.`;
      }
    },
  }),
  define({
    name: "open_link",
    description:
      "Open one of the Player's channels for the visitor: GitHub or LinkedIn in a new tab, email in their mail app (a new message to the Player), or this portfolio's link.",
    parameters: z.object({ channel: z.enum(CHANNELS) }),
    handler: ({ channel }) => {
      const { label, href } = channelTarget(channel, player.links, window.location.origin);
      if (channel === "email") {
        window.location.href = href;
        return "Opened a new email to the Player in the visitor's mail app.";
      }
      const tab = window.open(href, "_blank");
      if (!tab) {
        return `The browser blocked the new tab. Call show_contact_card so the visitor can open the ${label} with a click.`;
      }
      tab.opener = null;
      return `Opened the ${label} in a new tab.`;
    },
  }),
  define({
    name: "capture_snapshot",
    description: "Take a picture of the 3D temple as the visitor sees it right now (without the HUD) and download it as a PNG.",
    parameters: z.object({}),
    handler: async () => {
      const blob = await captureCanvas();
      if (!blob) return "The view could not be captured (no 3D view on screen).";
      const url = URL.createObjectURL(blob);
      const name = snapshotFileName(new Date());
      download(url, name);
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      play("click");
      return `Snapshot saved as ${name}.`;
    },
  }),
  define({
    name: "arise_all",
    description:
      "Raise EVERY fallen quest (project) in the Shadow Crypt, one extraction after another, until the whole legion stands. Opens the crypt. Takes a few seconds per shadow.",
    parameters: z.object({}),
    handler: async () => {
      const s = store();
      if (quests.every((q) => s.risen.includes(q.id))) return "Every quest has already risen.";
      if (s.panel !== "crypt") {
        s.travelTo("crypt");
        window.setTimeout(() => store().openPanel("crypt"), 450);
        await new Promise((r) => window.setTimeout(r, 1300));
      }
      const count = await ariseAll();
      const risen = store().risen.length;
      const tally = `${count} shadow${count === 1 ? "" : "s"} extracted`;
      return risen === quests.length
        ? `ARISE — ${tally}; the legion is complete (${risen}/${quests.length}).`
        : `ARISE — ${tally}, then the extraction stalled (${risen}/${quests.length} risen). Offer to try again.`;
    },
  }),
  define({
    name: "set_fullscreen",
    description: "Enter or leave immersive (fullscreen) mode.",
    parameters: z.object({ on: z.boolean() }),
    handler: async ({ on }) => {
      const ok = await setImmersion(on);
      if (ok) return `Immersive mode ${on ? "on" : "off"}.`;
      store().pushToast({ heading: "IMMERSION", body: "Press F (or the fullscreen chip) to enter immersive mode.", tone: "system" });
      return "The browser only allows fullscreen from the visitor's own click or key press — a notification now tells them to press F.";
    },
  }),
  define({
    name: "reset_progress",
    description:
      "Wipe the visitor's progress (level, XP, discovered zones, completed quests, risen shadows) and start over. ONLY when the visitor explicitly asks to reset / start over.",
    parameters: z.object({}),
    handler: () => {
      const s = store();
      if (s.rising) return "A shadow is mid-extraction; try again in a few seconds.";
      s.closePanel();
      s.resetProgress();
      return "Progress reset: the visitor is back to level 1 and every shadow has fallen again.";
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

export function executeSystemCommand(name: string, args: Record<string, unknown> = {}): string | Promise<string> {
  const cmd = systemCommands.find((c) => c.name === name);
  if (!cmd) return `Unknown command "${name}". Available: ${systemCommands.map((c) => c.name).join(", ")}.`;
  const parsed = cmd.parameters.safeParse(args ?? {});
  if (!parsed.success) {
    return `Invalid arguments for "${name}": ${parsed.error.issues.map((i) => `${i.path.join(".") || "args"} ${i.message}`).join("; ")}`;
  }
  const failed = (err: unknown) => `Command "${name}" failed: ${err instanceof Error ? err.message : String(err)}`;
  try {
    const result = cmd.handler(parsed.data);
    return typeof result === "string" ? result : result.catch(failed);
  } catch (err) {
    return failed(err);
  }
}
