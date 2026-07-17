import { player } from "@/config/player.config";
import { systemConfig } from "@/config/system.config";
import { TypewriterText } from "@/components/system/typewriter-text";

/**
 * DOM caption anchored under the 3D hologram rendered by SystemScene.
 * The spacer matches the hologram's screen footprint so the name sits
 * beneath the core, exactly where the old CSS placeholder ended.
 */
export function AvatarStage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-[5%] flex w-[38%] flex-col items-center justify-center gap-6"
    >
      <div className="size-72" />

      <div className="text-center">
        <p className="font-heading text-2xl font-bold tracking-[0.25em] text-foreground/90 text-glow">
          {player.name}
        </p>
        <p className="mt-1 font-heading text-xs tracking-[0.35em] text-system">
          {player.title.toUpperCase()}
        </p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          <TypewriterText text={systemConfig.avatarCaption} speed={45} />
        </p>
      </div>
    </div>
  );
}
