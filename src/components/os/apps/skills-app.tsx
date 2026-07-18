"use client";

import { motion, useReducedMotion } from "motion/react";
import { IconTile } from "@/components/system/icon-tile";
import { skillCategories, skillSets, skills } from "@/config/skills.config";
import { masteryGrade } from "@/lib/rarity";
import { sfx } from "@/lib/sfx";
import { useOsStore } from "@/store/os-store";

export function SkillsApp() {
  const reduced = useReducedMotion();
  const inspect = useOsStore((s) => s.inspect);

  return (
    <div className="space-y-7">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; {skills.length} skills acquired through grinding — click one for
        details
      </p>
      {skillSets.map((set) => (
        <section key={set.id}>
          <header className="mb-4 border-b border-system/20 pb-2">
            <h2 className="font-heading text-sm tracking-[0.3em] text-glow">
              {set.name}
            </h2>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              &gt; {set.blurb}
            </p>
          </header>
          <div className="grid gap-6 sm:grid-cols-2">
            {skillCategories
              .filter((category) => category.set === set.id)
              .map((category) => (
                <div key={category.id}>
                  <h3 className="mb-3 flex items-center gap-2.5 font-heading text-xs tracking-[0.2em] text-system text-glow">
                    <IconTile
                      icon={category.icon}
                      tone={category.tone}
                      size="sm"
                    />
                    {category.name.toUpperCase()}
                  </h3>
                  <ul className="space-y-1">
                    {skills
                      .filter((skill) => skill.category === category.id)
                      .map((skill, si) => (
                        <li key={skill.id}>
                          <button
                            type="button"
                            onClick={() => {
                              sfx.open();
                              inspect({ kind: "skill", id: skill.id });
                            }}
                            onMouseEnter={() => sfx.hover()}
                            className="group w-full rounded-sm px-1.5 py-1 text-left transition hover:bg-system/[0.07]"
                          >
                            <span className="mb-0.5 flex items-center justify-between gap-3 text-xs">
                              <span className="text-foreground/85 transition group-hover:text-system">
                                {skill.name}
                              </span>
                              <span className="font-heading text-system">
                                {masteryGrade(skill.mastery)}
                              </span>
                            </span>
                            <span className="block h-1 overflow-hidden rounded-full bg-secondary">
                              <motion.span
                                className="block h-full rounded-full bg-system/80"
                                initial={
                                  reduced
                                    ? { width: `${skill.mastery}%` }
                                    : { width: 0 }
                                }
                                animate={{ width: `${skill.mastery}%` }}
                                transition={{
                                  duration: 0.8,
                                  delay: si * 0.05,
                                  ease: [0.22, 1, 0.36, 1],
                                }}
                              />
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
