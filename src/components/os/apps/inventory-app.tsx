"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  inventoryCategories,
  inventoryItems,
} from "@/config/inventory.config";
import { sfx } from "@/lib/sfx";
import { rarityTile } from "@/lib/rarity";
import { useOsStore } from "@/store/os-store";
import { cn } from "@/lib/utils";

export function InventoryApp() {
  const reduced = useReducedMotion();
  const inspect = useOsStore((s) => s.inspect);
  const inspectTarget = useOsStore((s) => s.inspectTarget);
  const [category, setCategory] = useState<string | null>(null);

  const visible = category
    ? inventoryItems.filter((item) => item.category === category)
    : inventoryItems;

  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; {inventoryItems.length} items held ·{" "}
        {inventoryItems.filter((i) => i.rarity === "legendary").length}{" "}
        legendary · carry weight ∞ — click an item to inspect
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

      <ul className="grid grid-cols-5 gap-2.5">
        {visible.map((item, i) => (
          <li key={item.id}>
            <motion.button
              type="button"
              initial={reduced ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: reduced ? 0 : i * 0.02 }}
              onClick={() => {
                sfx.open();
                inspect({ kind: "item", id: item.id });
              }}
              onMouseEnter={() => sfx.hover()}
              aria-label={`${item.name} — ${item.rarity}`}
              aria-pressed={
                inspectTarget?.kind === "item" && inspectTarget.id === item.id
              }
              className={cn(
                "relative flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-sm border p-1 transition",
                rarityTile[item.rarity],
                inspectTarget?.kind === "item" &&
                  inspectTarget.id === item.id &&
                  "ring-1 ring-system/70 ring-offset-1 ring-offset-background",
              )}
            >
              <item.icon aria-hidden className="size-6" strokeWidth={1.5} />
              <span className="line-clamp-2 px-0.5 text-center font-mono text-[8px] leading-tight tracking-wide opacity-80">
                {item.name.toUpperCase()}
              </span>
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
    </div>
  );
}
