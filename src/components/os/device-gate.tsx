"use client";

import { useSyncExternalStore } from "react";
import { GlitchText } from "@/components/system/glitch-text";
import { SystemNotification } from "@/components/system/system-notification";
import { systemConfig } from "@/config/system.config";

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
          <GlitchText text={systemConfig.unsupported.error} />
        </p>
        <SystemNotification
          heading={systemConfig.unsupported.heading}
          className="max-w-md animate-flicker"
        >
          <p className="mb-3 font-heading text-sm tracking-[0.2em] text-foreground">
            {systemConfig.unsupported.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {systemConfig.unsupported.body}
          </p>
        </SystemNotification>
        <p className="font-mono text-xs text-muted-foreground">
          {systemConfig.unsupported.footer}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
