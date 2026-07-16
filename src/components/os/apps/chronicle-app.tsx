import { Medal } from "lucide-react";
import { achievements, chronicle } from "@/data/chronicle";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/system/icon-tile";

export function ChronicleApp() {
  return (
    <div className="space-y-7">
      <p className="font-mono text-xs text-muted-foreground">
        &gt; raid log — professional battles fought and won
      </p>

      <ol className="relative space-y-7 border-l border-system/30 pl-5">
        {chronicle.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[26px] top-1.5 size-2 rounded-full bg-system shadow-[0_0_8px_var(--system)]"
            />
            <p className="font-mono text-[11px] tracking-widest text-system">
              {entry.period}
            </p>
            <h3 className="mt-0.5 font-heading text-base tracking-wide text-foreground">
              {entry.role}
            </h3>
            <p className="text-xs text-muted-foreground">
              {entry.organization}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">
              {entry.summary}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.highlights.map((highlight) => (
                <Badge
                  key={highlight}
                  variant="secondary"
                  className="border border-system/20 font-mono text-[10px]"
                >
                  {highlight}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div>
        <h3 className="mb-3 font-heading text-xs tracking-[0.3em] text-system text-glow">
          ◈ TITLES ACQUIRED
        </h3>
        <ul className="space-y-2.5">
          {achievements.map((achievement) => (
            <li
              key={achievement.id}
              className="flex items-start gap-3 rounded-sm border border-system/15 bg-system/[0.03] p-3"
            >
              <IconTile icon={Medal} tone="gold" size="md" className="mt-0.5" />
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {achievement.period}
                </p>
                <p className="mt-0.5 font-heading text-sm leading-snug text-foreground">
                  {achievement.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {achievement.issuer}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
