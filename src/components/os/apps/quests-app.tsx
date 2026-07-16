"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { quests } from "@/data/quests";
import type { Quest, QuestRank } from "@/data/types";
import { sfx } from "@/lib/sfx";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const rankStyles: Record<QuestRank, string> = {
  S: "text-rank-s border-rank-s/50 shadow-[0_0_12px_var(--rank-s)]",
  A: "text-rank-a border-rank-a/50 shadow-[0_0_10px_var(--rank-a)]",
  B: "text-rank-b border-rank-b/50 shadow-[0_0_8px_var(--rank-b)]",
};

export function QuestsApp() {
  const [active, setActive] = useState<Quest | null>(null);

  if (active) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => {
            sfx.click();
            setActive(null);
          }}
          className="flex items-center gap-1.5 font-mono text-xs text-system transition hover:text-glow"
        >
          <ArrowLeft className="size-3.5" />
          [ BACK TO QUEST LOG ]
        </button>

        <div>
          <p className="font-mono text-[11px] tracking-[0.3em] text-system">
            ⚠ QUEST INFO — RANK {active.rank}
          </p>
          <h3 className="mt-1 font-heading text-xl tracking-wide text-glow">
            {active.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {active.summary}
          </p>
          {active.period && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              DURATION: {active.period}
            </p>
          )}
        </div>

        <div>
          <h4 className="mb-2 font-heading text-[11px] tracking-[0.3em] text-system">
            OBJECTIVES CLEARED
          </h4>
          <ul className="space-y-1.5 text-sm text-foreground/85">
            {active.details.map((detail) => (
              <li key={detail.slice(0, 24)} className="flex gap-2">
                <span aria-hidden className="text-system">✦</span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 font-heading text-[11px] tracking-[0.3em] text-system">
            REWARDS ACQUIRED
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {active.rewards.map((reward) => (
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

        {active.link && (
          <a
            href={active.link}
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

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; {quests.length} quests on record ·{" "}
        {quests.filter((q) => q.status === "cleared").length} cleared
      </p>
      <ul className="space-y-3">
        {quests.map((quest) => (
          <li key={quest.id}>
            <button
              type="button"
              onClick={() => {
                sfx.click();
                setActive(quest);
              }}
              onMouseEnter={() => sfx.hover()}
              className="group flex w-full items-start gap-4 rounded-sm border border-system/15 bg-system/[0.03] p-3.5 text-left transition hover:border-system/40 hover:bg-system/[0.07]"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-sm border font-heading text-lg font-bold",
                  rankStyles[quest.rank],
                )}
              >
                {quest.rank}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-sm tracking-wide text-foreground transition group-hover:text-system">
                    {quest.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[9px] tracking-widest uppercase"
                  >
                    {quest.type} · {quest.status}
                  </Badge>
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                  {quest.summary}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
