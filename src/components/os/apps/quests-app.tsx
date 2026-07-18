"use client";

import { quests } from "@/config/quests.config";
import type { Quest, QuestRank } from "@/config/types";
import { sfx } from "@/lib/sfx";
import { useOsStore } from "@/store/os-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const rankStyles: Record<QuestRank, string> = {
  S: "text-rank-s border-rank-s/50 shadow-[0_0_12px_var(--rank-s)]",
  A: "text-rank-a border-rank-a/50 shadow-[0_0_10px_var(--rank-a)]",
  B: "text-rank-b border-rank-b/50 shadow-[0_0_8px_var(--rank-b)]",
};

const sections: { type: Quest["type"]; heading: string; blurb: string }[] = [
  {
    type: "main",
    heading: "MAIN QUESTS",
    blurb: "the Player's storyline — guild contracts and raids",
  },
  {
    type: "side",
    heading: "SIDE QUESTS",
    blurb: "academic and personal expeditions",
  },
];

function QuestRow({ quest }: { quest: Quest }) {
  const inspect = useOsStore((s) => s.inspect);
  return (
    <button
      type="button"
      onClick={() => {
        sfx.open();
        inspect({ kind: "quest", id: quest.id });
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
            className={cn(
              "font-mono text-[9px] tracking-widest uppercase",
              quest.status === "ongoing" &&
                "animate-pulse-glow border-rank-s/50 text-rank-s",
            )}
          >
            {quest.status === "ongoing" ? "◈ in progress" : "cleared"}
          </Badge>
        </span>
        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
          {quest.summary}
        </span>
      </span>
    </button>
  );
}

export function QuestsApp() {
  return (
    <div className="space-y-6">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; {quests.length} quests on record ·{" "}
        {quests.filter((q) => q.status === "cleared").length} cleared ·{" "}
        {quests.filter((q) => q.status === "ongoing").length} active — click a
        quest for details
      </p>
      {sections.map((section) => (
        <section key={section.type}>
          <header className="mb-3 border-b border-system/20 pb-2">
            <h2 className="font-heading text-sm tracking-[0.3em] text-glow">
              {section.heading}
            </h2>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              &gt; {section.blurb}
            </p>
          </header>
          <ul className="space-y-3">
            {quests
              .filter((quest) => quest.type === section.type)
              .map((quest) => (
                <li key={quest.id}>
                  <QuestRow quest={quest} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
