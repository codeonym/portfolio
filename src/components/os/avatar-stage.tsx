import { Bot } from "lucide-react";
import { player } from "@/config/player.config";
import { systemConfig } from "@/config/system.config";
import { TypewriterText } from "@/components/system/typewriter-text";

/**
 * Hologram placeholder occupying the avatar slot on the desktop stage.
 * Phase 3: replace the inner "hologram" block with a React Three Fiber
 * <Canvas> rendering the 3D avatar — the slot, sizing, and caption stay.
 */
export function AvatarStage() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-[5%] flex w-[38%] flex-col items-center justify-center gap-6"
    >
      {/* hologram slot — future R3F canvas mounts here */}
      <div className="relative flex size-72 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border border-system/30 border-t-system/80 [animation-duration:14s]" />
        <div className="absolute inset-6 animate-spin rounded-full border border-arcane/25 border-b-arcane/70 [animation-direction:reverse] [animation-duration:10s]" />
        <div className="absolute inset-12 animate-spin rounded-full border border-dashed border-system/20 [animation-duration:24s]" />
        <div className="animate-pulse-glow flex size-36 items-center justify-center rounded-full bg-system/5">
          <div className="animate-[float-y_6s_ease-in-out_infinite]">
            <Bot className="size-20 text-system/50" strokeWidth={1} />
          </div>
        </div>
        {/* scanning beam sweeping the hologram */}
        <div className="absolute inset-x-8 h-px animate-[scan-y_5s_linear_infinite] bg-gradient-to-r from-transparent via-system/70 to-transparent" />
        {/* base glow */}
        <div className="absolute -bottom-8 left-1/2 h-6 w-48 -translate-x-1/2 rounded-[100%] bg-system/20 blur-xl" />
      </div>

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
