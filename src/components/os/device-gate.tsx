"use client";

import { useSyncExternalStore } from "react";
import { GlitchText } from "@/components/system/glitch-text";
import { SystemNotification } from "@/components/system/system-notification";

const QUERY = "(min-width: 1024px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): "supported" | "unsupported" {
  return window.matchMedia(QUERY).matches ? "supported" : "unsupported";
}

function getServerSnapshot(): "pending" {
  return "pending";
}

/** The System only manifests on displays ≥1024px wide. */
export function DeviceGate({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (state === "pending") {
    return <div aria-hidden className="fixed inset-0 bg-background" />;
  }

  if (state === "unsupported") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
        <p className="font-heading text-lg tracking-[0.3em] text-destructive">
          <GlitchText text="⚠ SYSTEM ERROR" />
        </p>
        <SystemNotification
          heading="UNSUPPORTED VESSEL"
          className="max-w-md animate-flicker"
        >
          <p className="mb-3 font-heading text-sm tracking-[0.2em] text-foreground">
            DISPLAY TOO SMALL TO MANIFEST THE SYSTEM
          </p>
          <p className="text-sm text-muted-foreground">
            This interface is a full desktop operating system and requires a
            laptop or desktop terminal (≥ 1024px wide). Return through a larger
            gate, Player.
          </p>
        </SystemNotification>
        <p className="font-mono text-xs text-muted-foreground">
          [ CONNECTION HELD · AWAITING SUITABLE HARDWARE ]
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
