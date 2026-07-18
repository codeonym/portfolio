"use client";

import { useEffect } from "react";
import { executeSystemCommand, systemCommands } from "./system-commands";
import { getSystemSnapshot } from "./system-snapshot";

declare global {
  interface Window {
    /** console access to the agent bridge — try system.run("open_app", { app: "inventory" }) */
    system?: {
      snapshot: typeof getSystemSnapshot;
      run: typeof executeSystemCommand;
      commands: string[];
    };
  }
}

/**
 * Exposes the agent bridge on `window.system` — deliberately shipped
 * to production: it is the manual test bench for every command an
 * agent will get in V5, and a console easter egg for visitors who
 * open devtools on an AI engineer's portfolio.
 */
export function AgentDevBridge() {
  useEffect(() => {
    window.system = {
      snapshot: getSystemSnapshot,
      run: executeSystemCommand,
      commands: systemCommands.map((c) => c.name),
    };
    return () => {
      delete window.system;
    };
  }, []);
  return null;
}
