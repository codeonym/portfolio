import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "system" | "arcane" | "gold" | "ember";
type Size = "sm" | "md" | "lg";

const tones: Record<Tone, string> = {
  system:
    "border-system/40 bg-system/10 text-system shadow-[0_0_10px_oklch(0.72_0.14_235/0.3)]",
  arcane:
    "border-arcane/40 bg-arcane/10 text-arcane shadow-[0_0_10px_oklch(0.6_0.21_295/0.3)]",
  gold: "border-rank-s/40 bg-rank-s/10 text-rank-s shadow-[0_0_10px_oklch(0.78_0.15_85/0.3)]",
  ember:
    "border-destructive/40 bg-destructive/10 text-destructive shadow-[0_0_10px_oklch(0.6_0.22_25/0.3)]",
};

const boxSizes: Record<Size, string> = {
  sm: "size-6 rounded-[3px]",
  md: "size-9 rounded-sm",
  lg: "size-11 rounded-sm",
};

const iconSizes: Record<Size, string> = {
  sm: "size-3.5",
  md: "size-4.5",
  lg: "size-5.5",
};

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  size?: Size;
  className?: string;
}

/** Glowing framed icon tile, per the System's HUD iconography. */
export function IconTile({
  icon: Icon,
  tone = "system",
  size = "md",
  className,
}: IconTileProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border",
        boxSizes[size],
        tones[tone],
        className,
      )}
    >
      <Icon className={iconSizes[size]} strokeWidth={1.75} />
    </span>
  );
}
