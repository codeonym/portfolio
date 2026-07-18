/**
 * ── AGENT BRIDGE ──────────────────────────────────────────────
 * The System's contract with AI agents (LangChain + CopilotKit
 * v2 arrive in V5; voice on top of that).
 *
 *  read side  — system-snapshot: serializable state + dossier
 *  write side — system-commands: JSON-Schema tool registry
 *
 * V5 sketch:
 *   const snapshot = useSystemSnapshot();
 *   useAgentContext({ description: "System state", value: snapshot });
 *   systemCommands.forEach((c) => useFrontendTool(toFrontendTool(c)));
 */

export type {
  AppSnapshot,
  SystemSnapshot,
  WindowSnapshot,
} from "./system-snapshot";
export { getSystemSnapshot, useSystemSnapshot } from "./system-snapshot";
export type { SystemCommand } from "./system-commands";
export { executeSystemCommand, systemCommands } from "./system-commands";
