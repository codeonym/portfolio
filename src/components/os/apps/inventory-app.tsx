"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  inventoryCategories,
  inventoryItems,
} from "@/config/inventory.config";
import type { InventoryItem, Rarity } from "@/config/types";
import { apps } from "@/config/apps.config";
import { sfx } from "@/lib/sfx";
import { useOsStore } from "@/store/os-store";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const rarityTile: Record<Rarity, string> = {
  legendary:
    "border-rank-s/60 bg-rank-s/10 text-rank-s shadow-[0_0_14px_oklch(0.78_0.15_85/0.35)] hover:shadow-[0_0_22px_oklch(0.78_0.15_85/0.55)]",
  epic: "border-arcane/60 bg-arcane/10 text-arcane shadow-[0_0_12px_oklch(0.6_0.21_295/0.35)] hover:shadow-[0_0_20px_oklch(0.6_0.21_295/0.55)]",
  rare: "border-system/50 bg-system/10 text-system shadow-[0_0_10px_oklch(0.72_0.14_235/0.3)] hover:shadow-[0_0_18px_oklch(0.72_0.14_235/0.5)]",
  common:
    "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
};

const rarityText: Record<Rarity, string> = {
  legendary: "text-rank-s",
  epic: "text-arcane",
  rare: "text-system",
  common: "text-muted-foreground",
};

const rarityBar: Record<Rarity, string> = {
  legendary: "bg-rank-s shadow-[0_0_6px_oklch(0.78_0.15_85/0.6)]",
  epic: "bg-arcane shadow-[0_0_6px_oklch(0.6_0.21_295/0.6)]",
  rare: "bg-system shadow-[0_0_6px_oklch(0.72_0.14_235/0.6)]",
  common: "bg-muted-foreground",
};

const MASTERY_SEGMENTS = 20;

export function InventoryApp() {
  const reduced = useReducedMotion();
  const openApp = useOsStore((s) => s.open);
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<InventoryItem>(inventoryItems[0]);

  const visible = category
    ? inventoryItems.filter((item) => item.category === category)
    : inventoryItems;
  const filledSegments = Math.round(
    (selected.mastery / 100) * MASTERY_SEGMENTS,
  );
  const selectedCategory = inventoryCategories.find(
    (c) => c.id === selected.category,
  );

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; {inventoryItems.length} items attuned ·{" "}
        {inventoryItems.filter((i) => i.rarity === "legendary").length}{" "}
        legendary · carry weight ∞
      </p>

      <div
        role="tablist"
        aria-label="Inventory categories"
        className="flex flex-wrap gap-1.5"
      >
        {[null, ...inventoryCategories.map((c) => c.id)].map((id) => {
          const def = inventoryCategories.find((c) => c.id === id);
          const active = category === id;
          return (
            <button
              key={id ?? "all"}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                sfx.click();
                setCategory(id);
              }}
              onMouseEnter={() => sfx.hover()}
              className={cn(
                "flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-heading text-[10px] tracking-[0.2em] transition",
                active
                  ? "border-system/50 bg-system/15 text-system"
                  : "border-system/15 text-muted-foreground hover:border-system/30 hover:text-foreground",
              )}
            >
              {def && <def.icon aria-hidden className="size-3" />}
              {def ? def.name : "ALL"}
            </button>
          );
        })}
      </div>

      <ul className="grid grid-cols-6 gap-2">
        {visible.map((item, i) => (
          <li key={item.id}>
            <motion.button
              type="button"
              initial={reduced ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.02 }}
              onClick={() => {
                sfx.click();
                setSelected(item);
              }}
              onMouseEnter={() => sfx.hover()}
              aria-label={`${item.name} — ${item.rarity}`}
              aria-pressed={selected.id === item.id}
              className={cn(
                "relative flex aspect-square w-full items-center justify-center rounded-sm border transition",
                rarityTile[item.rarity],
                selected.id === item.id &&
                  "ring-1 ring-system/70 ring-offset-1 ring-offset-background",
              )}
            >
              <item.icon aria-hidden className="size-6" strokeWidth={1.5} />
              {item.rarity === "legendary" && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 text-[9px] text-rank-s"
                >
                  ★
                </span>
              )}
            </motion.button>
          </li>
        ))}
      </ul>

      {/* item detail plate */}
      <div className="system-frame rounded-sm p-4">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-sm border",
              rarityTile[selected.rarity],
            )}
          >
            <selected.icon className="size-7" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-heading text-sm tracking-wide text-foreground">
                {selected.name}
              </h3>
              <span
                className={cn(
                  "font-heading text-[10px] tracking-[0.3em] uppercase",
                  rarityText[selected.rarity],
                )}
              >
                ◆ {selected.rarity}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
              {selectedCategory?.name ?? "UNCLASSIFIED"}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                MASTERY
              </span>
              <div className="flex flex-1 gap-[2px]">
                {Array.from({ length: MASTERY_SEGMENTS }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 skew-x-[-12deg] rounded-[1px]",
                      i < filledSegments
                        ? rarityBar[selected.rarity]
                        : "bg-secondary",
                    )}
                  />
                ))}
              </div>
              <span className="font-mono text-xs text-foreground/90 tabular-nums">
                {selected.mastery}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85 italic">
          “{selected.lore}”
        </p>
        {selected.tags && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {selected.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="border border-system/20 font-mono text-[10px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {selected.unlocks && (
          <button
            type="button"
            onClick={() => {
              sfx.open();
              openApp(selected.unlocks!);
            }}
            onMouseEnter={() => sfx.hover()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm border border-rank-s/50 bg-rank-s/10 px-3 py-2 font-heading text-[11px] tracking-[0.3em] text-rank-s transition hover:-translate-y-0.5 hover:bg-rank-s/20 hover:shadow-[0_0_16px_oklch(0.78_0.15_85/0.4)]"
          >
            ◈ INSPECT — OPEN {apps[selected.unlocks].title}
          </button>
        )}
      </div>
    </div>
  );
}
