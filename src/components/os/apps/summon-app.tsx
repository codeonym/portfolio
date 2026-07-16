import { AtSign, Code2, Globe } from "lucide-react";
import { IconTile } from "@/components/system/icon-tile";
import { player } from "@/config/player.config";

const channels = [
  {
    label: "GITHUB",
    href: player.links.github,
    display: "github.com/codeonym",
    Icon: Code2,
  },
  {
    label: "LINKEDIN",
    href: player.links.linkedin,
    display: "linkedin.com/in/codeonym",
    Icon: Globe,
  },
  {
    label: "EMAIL",
    href: `mailto:${player.links.email}`,
    display: player.links.email,
    Icon: AtSign,
  },
];

export function SummonApp() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        The Player accepts new quests: agentic AI systems, multi-agent
        architectures, and LLM-driven products. Open a channel below.
      </p>
      <ul className="space-y-3">
        {channels.map(({ label, href, display, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-sm border border-system/15 bg-system/[0.03] px-4 py-3 transition hover:border-system/40 hover:bg-system/[0.07]"
            >
              <IconTile
                icon={Icon}
                size="md"
                className="transition group-hover:scale-105"
              />
              <span>
                <span className="block font-heading text-[11px] tracking-[0.25em] text-system">
                  {label}
                </span>
                <span className="block font-mono text-sm text-foreground/85">
                  {display}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
