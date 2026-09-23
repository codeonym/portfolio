"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useAgentContext, useFrontendTool } from "@copilotkit/react-core/v2";
import { FileText, Mail } from "lucide-react";
import { GithubMark, LinkedinMark } from "@/components/system/brand-marks";
import { systemCommands, type SystemCommand } from "@/agent/system-commands";
import { player } from "@/config/player.config";
import { quests } from "@/config/quests.config";
import { findSkill, skills } from "@/config/skills.config";
import { zoneById } from "@/config/world.config";
import { play } from "@/lib/audio";
import { masteryGrade, rarityTile } from "@/lib/rarity";
import { cn } from "@/lib/utils";
import { levelFor, useWorldStore } from "@/store/world-store";

/**
 * ── THE SYSTEM'S HANDS ────────────────────────────────────────
 * Registers every world command as a CopilotKit v2 frontend tool
 * (executed here, in the browser, when the agent calls it), plus two
 * generative-UI tools that draw cards inside the dialogue, and feeds
 * the live world state to the agent as context.
 */

/** one `useFrontendTool` per registry entry — the registry is static, so hook order is too */
function CommandTool({ command }: { command: SystemCommand }) {
  useFrontendTool({
    name: command.name,
    description: command.description,
    parameters: command.parameters,
    handler: async (args) => {
      const parsed = command.parameters.safeParse(args ?? {});
      if (!parsed.success) return `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`;
      return command.handler(parsed.data);
    },
  });
  return null;
}

const LINKS = [
  { id: "github", label: "GitHub", icon: GithubMark, href: player.links.github },
  { id: "linkedin", label: "LinkedIn", icon: LinkedinMark, href: player.links.linkedin },
  { id: "email", label: "Email", icon: Mail, href: `mailto:${player.links.email}` },
  { id: "cv", label: "CV (PDF)", icon: FileText, href: "/cv.pdf" },
] as const;

const linksSchema = z.object({
  links: z
    .array(z.enum(["github", "linkedin", "email", "cv"]))
    .optional()
    .describe("Which channels to show; omit for all."),
});

const skillsSchema = z.object({
  ids: z.array(z.string()).min(1).max(12).describe("Skill ids from the dossier, strongest first."),
  title: z.string().optional().describe("Short caption, e.g. 'AGENT STACK'"),
});

function ContactCard({ ids }: { ids?: string[] }) {
  const shown = LINKS.filter((l) => !ids?.length || ids.includes(l.id));
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {shown.map((l) => (
        <a
          key={l.id}
          href={l.href}
          target={l.id === "email" ? undefined : "_blank"}
          rel="noreferrer noopener"
          onClick={() => play("click")}
          className="hud-chip pointer-events-auto justify-start gap-2 px-3 py-2 text-sm"
        >
          <l.icon className="size-4 text-system" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

function SkillCard({ ids, title }: { ids?: string[]; title?: string }) {
  const setInspect = useWorldStore((s) => s.setInspect);
  const list = (ids ?? []).map((id) => findSkill(id)).filter((s): s is NonNullable<typeof s> => !!s);
  if (!list.length) return null;
  return (
    <div className="space-y-1.5">
      {title && <p className="font-display text-[9px] tracking-[0.3em] text-system">{title.toUpperCase()}</p>}
      <div className="flex flex-wrap gap-1.5">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              play("click");
              setInspect({ kind: "skill", id: s.id });
            }}
            className={cn("flex items-center gap-1.5 border px-2 py-1 text-xs transition-shadow", rarityTile[s.rarity])}
          >
            <s.icon className="size-3.5" />
            <span className="text-foreground/90">{s.name}</span>
            <span className="font-display text-[9px]">{masteryGrade(s.mastery)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PresentationTools() {
  useFrontendTool({
    name: "show_contact_card",
    description:
      "Draw a contact card inside the dialogue with clickable GitHub / LinkedIn / email / CV buttons. Use when the visitor wants to reach, hire or follow the Player.",
    parameters: linksSchema,
    handler: async ({ links }) =>
      `Contact card shown (${links?.join(", ") || "all channels"}). The visitor sees the buttons — do not list the links or address in text; reply with one short line.`,
    render: ({ args }) => <ContactCard ids={args.links} />,
  });
  useFrontendTool({
    name: "present_skills",
    description:
      "Draw a row of skill badges (with mastery grades) inside the dialogue; each badge opens its inspect card. Use when answering about skills or tech stack.",
    parameters: skillsSchema,
    handler: async ({ ids }) => {
      const unknown = ids.filter((id) => !findSkill(id));
      return unknown.length
        ? `Shown, but unknown skill ids were skipped: ${unknown.join(", ")}. Valid ids: ${skills.map((s) => s.id).join(", ")}.`
        : `Presented ${ids.length} skill badges with grades. The visitor sees them — do not list the skills again; add at most two lines of insight.`;
    },
    render: ({ args }) => <SkillCard ids={args.ids} title={args.title} />,
  });
  return null;
}

/** what the visitor is looking at right now — kept small, the dossier lives server-side */
function WorldContext() {
  const panel = useWorldStore((s) => s.panel);
  const nearZone = useWorldStore((s) => s.nearZone);
  const cvOpen = useWorldStore((s) => s.cvOpen);
  const mapOpen = useWorldStore((s) => s.mapOpen);
  const inspect = useWorldStore((s) => s.inspect);
  const visited = useWorldStore((s) => s.visited);
  const completed = useWorldStore((s) => s.completed);
  const risen = useWorldStore((s) => s.risen);
  const xp = useWorldStore((s) => s.xp);
  const muted = useWorldStore((s) => s.muted);
  const quality = useWorldStore((s) => s.quality);
  const touch = useWorldStore((s) => s.touch);

  const value = useMemo(
    () => ({
      openWindow: panel ? `${panel} (${zoneById[panel].section})` : null,
      hunterStandingAt: nearZone,
      cvViewerOpen: cvOpen,
      worldMapOpen: mapOpen,
      inspecting: inspect ? { kind: inspect.kind, id: inspect.id } : null,
      visitor: {
        level: levelFor(xp),
        xp,
        zonesDiscovered: visited,
        systemQuestsCompleted: completed,
        shadowsRisen: risen,
        shadowsStillFallen: quests.filter((q) => !risen.includes(q.id)).map((q) => q.id),
      },
      settings: { soundMuted: muted, graphics: quality, device: touch ? "touch/mobile" : "desktop" },
    }),
    [panel, nearZone, cvOpen, mapOpen, inspect, visited, completed, risen, xp, muted, quality, touch],
  );

  useAgentContext({ description: "Live state of the visitor's world (what is open, where the Hunter stands, visitor progress)", value });
  return null;
}

export function SystemTools() {
  return (
    <>
      {systemCommands.map((c) => (
        <CommandTool key={c.name} command={c} />
      ))}
      <PresentationTools />
      <WorldContext />
    </>
  );
}

export const PRESENTATION_TOOLS = new Set(["show_contact_card", "present_skills"]);
