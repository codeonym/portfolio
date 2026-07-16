"use client";

import { player } from "@/config/player.config";
import { systemConfig } from "@/config/system.config";
import { useCountUp } from "@/hooks/use-count-up";
import { GlitchText } from "@/components/system/glitch-text";
import { StatBar } from "@/components/system/stat-bar";
import { VitalBar } from "@/components/system/vital-bar";

export function StatusApp() {
  const level = useCountUp(player.level, true, 1400);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 font-mono text-[11px] tracking-[0.25em] text-muted-foreground">
          [ PLAYER IDENTIFIED ]
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-wider">
          <GlitchText text={player.name} className="text-glow" />
        </h2>
        <p className="mt-1.5 font-heading text-xs tracking-[0.25em] text-system">
          {player.job.toUpperCase()} · {player.title.toUpperCase()}
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="system-frame shrink-0 rounded-sm px-4 py-2 text-center">
          <div className="font-heading text-[10px] tracking-[0.3em] text-muted-foreground">
            LEVEL
          </div>
          <div className="font-heading text-3xl font-bold text-system text-glow tabular-nums">
            {level}
          </div>
        </div>
        <div className="space-y-0.5 text-sm text-muted-foreground">
          <p>
            <span className="text-system">GUILD:</span> {player.guild}
          </p>
          <p>
            <span className="text-system">BASE:</span> {player.location}
          </p>
          <p>
            <span className="text-system">TONGUES:</span>{" "}
            {player.languages.map((l) => `${l.name} (${l.grade})`).join(" · ")}
          </p>
        </div>
      </div>

      <div className="space-y-3 border-y border-system/15 py-4">
        {systemConfig.vitals.map((vital) => (
          <VitalBar
            key={vital.code}
            icon={vital.icon}
            code={vital.code}
            label={vital.label}
            reading={vital.reading}
            percent={vital.percent}
            tone={vital.tone}
          />
        ))}
      </div>

      <div className="space-y-3">
        {player.stats.map((stat, i) => (
          <StatBar key={stat.code} stat={stat} delay={i * 0.1} />
        ))}
      </div>

      <div className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
        {player.profile.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>

      <blockquote className="border-l-2 border-system/50 pl-4 text-sm italic leading-relaxed text-foreground/80">
        “{player.creed}”
      </blockquote>
    </div>
  );
}
