"use client";

import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Container,
  Database,
  Hexagon,
  Layers,
  Network,
  Terminal,
} from "lucide-react";
import { IconTile } from "@/components/system/icon-tile";
import { skillCategories } from "@/config/skills.config";

const categoryIcons: Record<
  string,
  { icon: LucideIcon; tone: "system" | "arcane" | "gold" | "ember" }
> = {
  "AI Architectures & Principles": { icon: Network, tone: "arcane" },
  "AI Agent Stack": { icon: Bot, tone: "arcane" },
  "Programming Languages": { icon: Terminal, tone: "system" },
  "Web Development": { icon: Layers, tone: "system" },
  Databases: { icon: Database, tone: "gold" },
  "DevOps & Observability": { icon: Container, tone: "ember" },
};

function masteryGrade(level: number): string {
  if (level >= 90) return "S";
  if (level >= 85) return "A";
  if (level >= 78) return "B";
  return "C";
}

export function SkillsApp() {
  const reduced = useReducedMotion();

  return (
    <div className="space-y-6">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; passive and active skills acquired through grinding
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {skillCategories.map((category) => (
          <div key={category.name}>
            <h3 className="mb-3 flex items-center gap-2.5 font-heading text-xs tracking-[0.2em] text-system text-glow">
              <IconTile
                icon={(categoryIcons[category.name] ?? { icon: Hexagon }).icon}
                tone={categoryIcons[category.name]?.tone ?? "system"}
                size="sm"
              />
              {category.name.toUpperCase()}
            </h3>
            <ul className="space-y-2">
              {category.skills.map((skill, si) => (
                <li key={skill.name}>
                  <div className="mb-0.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground/85">{skill.name}</span>
                    <span className="font-heading text-system">
                      {masteryGrade(skill.level)}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-secondary">
                    <motion.div
                      className="h-full rounded-full bg-system/80"
                      initial={
                        reduced ? { width: `${skill.level}%` } : { width: 0 }
                      }
                      animate={{ width: `${skill.level}%` }}
                      transition={{
                        duration: 0.8,
                        delay: si * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
