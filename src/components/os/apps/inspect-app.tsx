"use client";

import { ExternalLink } from "lucide-react";
import { apps } from "@/config/apps.config";
import { findItem, inventoryCategories } from "@/config/inventory.config";
import { findSkill, skillCategories } from "@/config/skills.config";
import { quests } from "@/config/quests.config";
import type { QuestRank, Rarity } from "@/config/types";
import { sfx } from "@/lib/sfx";
import { masteryGrade, rarityBar, rarityText, rarityTile } from "@/lib/rarity";
import { useOsStore } from "@/store/os-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MASTERY_SEGMENTS = 20;

const rankStyles: Record<QuestRank, string> = {
  S: "text-rank-s border-rank-s/50 shadow-[0_0_12px_var(--rank-s)]",
  A: "text-rank-a border-rank-a/50 shadow-[0_0_10px_var(--rank-a)]",
  B: "text-rank-b border-rank-b/50 shadow-[0_0_8px_var(--rank-b)]",
};

function KindLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.3em] text-system">
      {children}
    </p>
  );
}

function MasteryGauge({ mastery, rarity }: { mastery: number; rarity: Rarity }) {
  const filled = Math.round((mastery / 100) * MASTERY_SEGMENTS);
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground">
        MASTERY
      </span>
      <div className="flex flex-1 gap-[2px]">
        {Array.from({ length: MASTERY_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 skew-x-[-12deg] rounded-[1px]",
              i < filled ? rarityBar[rarity] : "bg-secondary",
            )}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-foreground/90 tabular-nums">
        {mastery}
      </span>
    </div>
  );
}

function Tags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="border border-system/20 font-mono text-[10px]"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}

/**
 * The System's singleton INFO window — a game-style detail popup.
 * Shows whatever was last inspected (skill, item or quest) and
 * retargets in place when something else is clicked.
 */
export function InspectApp() {
  const target = useOsStore((s) => s.inspectTarget);
  const openApp = useOsStore((s) => s.open);

  if (!target) {
    return (
      <p className="py-6 text-center font-mono text-xs text-muted-foreground">
        &gt; nothing inspected — select a skill, item or quest
      </p>
    );
  }

  if (target.kind === "skill") {
    const skill = findSkill(target.id);
    if (!skill) return null;
    const category = skillCategories.find((c) => c.id === skill.category);
    return (
      <div className="space-y-4">
        <KindLabel>◈ SKILL INFO</KindLabel>
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-sm border",
              rarityTile[skill.rarity],
            )}
          >
            <skill.icon className="size-7" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-base tracking-wide text-glow">
                {skill.name}
              </h3>
              <span
                className={cn(
                  "font-heading text-[10px] tracking-[0.3em] uppercase",
                  rarityText[skill.rarity],
                )}
              >
                ◆ {skill.rarity}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              {category?.name ?? "UNCLASSIFIED"} · GRADE{" "}
              {masteryGrade(skill.mastery)}
            </p>
          </div>
        </div>
        <MasteryGauge mastery={skill.mastery} rarity={skill.rarity} />
        <p className="text-sm leading-relaxed text-foreground/85 italic">
          “{skill.lore}”
        </p>
        <Tags tags={skill.tags} />
      </div>
    );
  }

  if (target.kind === "item") {
    const item = findItem(target.id);
    if (!item) return null;
    const category = inventoryCategories.find((c) => c.id === item.category);
    return (
      <div className="space-y-4">
        <KindLabel>◈ ITEM INFO</KindLabel>
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-sm border",
              rarityTile[item.rarity],
            )}
          >
            <item.icon className="size-7" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-base tracking-wide text-glow">
                {item.name}
              </h3>
              <span
                className={cn(
                  "font-heading text-[10px] tracking-[0.3em] uppercase",
                  rarityText[item.rarity],
                )}
              >
                ◆ {item.rarity}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
              {category?.name ?? "UNCLASSIFIED"}
              {item.meta ? ` · ${item.meta}` : ""}
            </p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground/85 italic">
          “{item.lore}”
        </p>
        <Tags tags={item.tags} />
        {item.unlocks && (
          <button
            type="button"
            onClick={() => {
              sfx.open();
              openApp(item.unlocks!);
            }}
            onMouseEnter={() => sfx.hover()}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-rank-s/50 bg-rank-s/10 px-3 py-2 font-heading text-[11px] tracking-[0.3em] text-rank-s transition hover:-translate-y-0.5 hover:bg-rank-s/20 hover:shadow-[0_0_16px_oklch(0.78_0.15_85/0.4)]"
          >
            ◈ USE — OPEN {apps[item.unlocks].title}
          </button>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            onMouseEnter={() => sfx.hover()}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-system/40 bg-system/10 px-3 py-2 font-heading text-[11px] tracking-[0.3em] text-system transition hover:-translate-y-0.5 hover:bg-system/20"
          >
            ◈ USE — TRAVEL <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    );
  }

  const quest = quests.find((q) => q.id === target.id);
  if (!quest) return null;
  return (
    <div className="space-y-4">
      <KindLabel>⚠ QUEST INFO — RANK {quest.rank}</KindLabel>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-sm border font-heading text-xl font-bold",
            rankStyles[quest.rank],
          )}
        >
          {quest.rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base tracking-wide text-glow">
            {quest.name}
          </h3>
          <p className="mt-0.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {quest.type} QUEST · {quest.status}
            {quest.period ? ` · ${quest.period}` : ""}
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {quest.summary}
      </p>
      <div>
        <h4 className="mb-2 font-heading text-[11px] tracking-[0.3em] text-system">
          {quest.status === "ongoing" ? "ACTIVE OBJECTIVES" : "OBJECTIVES CLEARED"}
        </h4>
        <ul className="space-y-1.5 text-sm text-foreground/85">
          {quest.details.map((detail) => (
            <li key={detail.slice(0, 24)} className="flex gap-2">
              <span aria-hidden className="text-system">
                ✦
              </span>
              {detail}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 font-heading text-[11px] tracking-[0.3em] text-system">
          {quest.status === "ongoing" ? "REWARDS ACCRUING" : "REWARDS ACQUIRED"}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {quest.rewards.map((reward) => (
            <Badge
              key={reward}
              variant="secondary"
              className="border border-system/20 font-mono text-xs"
            >
              {reward}
            </Badge>
          ))}
        </div>
      </div>
      {quest.link && (
        <a
          href={quest.link}
          target="_blank"
          rel="noreferrer"
          className="inline-block font-mono text-sm text-system underline-offset-4 hover:underline"
        >
          [ VIEW REPOSITORY ↗ ]
        </a>
      )}
    </div>
  );
}
