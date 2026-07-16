"use client";

import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { Brain, Hexagon, Radar, Shield, Sword, WandSparkles, Zap } from "lucide-react";
import { IconTile } from "@/components/system/icon-tile";
import type { Stat } from "@/data/types";

const statIcons: Record<string, { icon: LucideIcon; tone: "system" | "arcane" | "gold" | "ember" }> = {
  INT: { icon: Brain, tone: "arcane" },
  MP: { icon: WandSparkles, tone: "system" },
  STR: { icon: Sword, tone: "ember" },
  AGI: { icon: Zap, tone: "gold" },
  VIT: { icon: Shield, tone: "system" },
  PER: { icon: Radar, tone: "arcane" },
};

export function StatBar({ stat, delay = 0 }: { stat: Stat; delay?: number }) {
  const reduced = useReducedMotion();
  const { icon, tone } = statIcons[stat.code] ?? {
    icon: Hexagon,
    tone: "system" as const,
  };
  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconTile icon={icon} tone={tone} size="sm" />
          <span className="font-heading text-sm tracking-widest text-system text-glow">
            {stat.code}
          </span>
          <span className="text-sm text-muted-foreground">{stat.label}</span>
        </div>
        <span className="font-mono text-sm text-foreground/90">
          {stat.value}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-system to-arcane"
          initial={reduced ? { width: `${stat.value}%` } : { width: 0 }}
          whileInView={{ width: `${stat.value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
