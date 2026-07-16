import type { LucideIcon } from "lucide-react";
import { IconTile } from "@/components/system/icon-tile";
import { cn } from "@/lib/utils";

const SEGMENTS = 24;

interface VitalBarProps {
  icon: LucideIcon;
  code: string;
  label: string;
  reading: string;
  /** 0–100 */
  percent: number;
  tone: "ember" | "system";
}

/** Segmented HP/SP-style vital gauge, per the System's character sheet. */
export function VitalBar({
  icon,
  code,
  label,
  reading,
  percent,
  tone,
}: VitalBarProps) {
  const filled = Math.round((percent / 100) * SEGMENTS);
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-heading text-xs tracking-widest",
                tone === "ember" ? "text-destructive" : "text-system",
              )}
            >
              {code}
            </span>
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
              ({label})
            </span>
          </span>
          <span className="font-mono text-xs text-foreground/90">
            {reading}
          </span>
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 skew-x-[-12deg] rounded-[1px]",
                i < filled
                  ? tone === "ember"
                    ? "bg-destructive shadow-[0_0_6px_oklch(0.6_0.22_25/0.6)]"
                    : "bg-system shadow-[0_0_6px_oklch(0.72_0.14_235/0.6)]"
                  : "bg-secondary",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
