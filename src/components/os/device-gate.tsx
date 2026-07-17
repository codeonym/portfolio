"use client";

import { useSyncExternalStore } from "react";
import { SystemScreen } from "@/components/system/system-screen";
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
    return <SystemScreen copy={systemConfig.unsupported} />;
  }

  return <>{children}</>;
}
