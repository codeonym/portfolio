import type { Rarity } from "@/config/types";

/** tile chrome per rarity — border, glow, tint */
export const rarityTile: Record<Rarity, string> = {
  legendary:
    "border-rank-s/60 bg-rank-s/10 text-rank-s shadow-[0_0_14px_oklch(0.78_0.15_85/0.35)] hover:shadow-[0_0_22px_oklch(0.78_0.15_85/0.55)]",
  epic: "border-arcane/60 bg-arcane/10 text-arcane shadow-[0_0_12px_oklch(0.6_0.21_295/0.35)] hover:shadow-[0_0_20px_oklch(0.6_0.21_295/0.55)]",
  rare: "border-system/50 bg-system/10 text-system shadow-[0_0_10px_oklch(0.72_0.14_235/0.3)] hover:shadow-[0_0_18px_oklch(0.72_0.14_235/0.5)]",
  common:
    "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
};

export const rarityText: Record<Rarity, string> = {
  legendary: "text-rank-s",
  epic: "text-arcane",
  rare: "text-system",
  common: "text-muted-foreground",
};

export const rarityBar: Record<Rarity, string> = {
  legendary: "bg-rank-s shadow-[0_0_6px_oklch(0.78_0.15_85/0.6)]",
  epic: "bg-arcane shadow-[0_0_6px_oklch(0.6_0.21_295/0.6)]",
  rare: "bg-system shadow-[0_0_6px_oklch(0.72_0.14_235/0.6)]",
  common: "bg-muted-foreground",
};

/** mastery → grade letter, shared across skill displays */
export function masteryGrade(mastery: number): string {
  if (mastery >= 90) return "S";
  if (mastery >= 85) return "A";
  if (mastery >= 78) return "B";
  return "C";
}
