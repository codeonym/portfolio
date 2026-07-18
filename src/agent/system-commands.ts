import type { AppId } from "@/config/apps.config";
import { appIds, apps, isAppId } from "@/config/apps.config";
import {
  enterFullscreen,
  exitFullscreen,
} from "@/hooks/use-fullscreen";
import type { ArrangeLayout } from "@/store/os-store";
import { useOsStore } from "@/store/os-store";
import { useSoundStore } from "@/store/sound-store";

/**
 * ── AGENT BRIDGE · WRITE SIDE ─────────────────────────────────
 * Every way an AI agent may drive the System, as a flat registry
 * of commands: name, model-facing description, JSON-Schema
 * parameters and a handler that returns a human-readable result
 * (the tool result the model reasons about).
 *
 * The registry is framework-neutral by design:
 *  - LangChain / LangGraph tools accept JSON Schema directly.
 *  - CopilotKit v2 `useFrontendTool` wants zod — V5 maps each
 *    entry with a one-line schema adapter, one hook call per
 *    command, no changes here.
 * New apps need zero work: commands take app ids from the
 * registry in apps.config, so adding an app there extends every
 * command automatically.
 */

export interface SystemCommand {
  name: string;
  description: string;
  /** JSON Schema (draft-07 subset) for the arguments object */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
  /** executes against the stores; returns the tool result for the model */
  handler: (args: Record<string, unknown>) => string;
}

const APP_ENUM = {
  type: "string",
  enum: appIds,
  description: "Which System app the command targets.",
} as const;

const badApp = (value: unknown) =>
  `Unknown app "${String(value)}". Valid apps: ${appIds.join(", ")}.`;

function requireApp(args: Record<string, unknown>): AppId | null {
  const value = args.app;
  return typeof value === "string" && isAppId(value) ? value : null;
}

function requireApps(value: unknown): AppId[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter(
    (v): v is AppId => typeof v === "string" && isAppId(v),
  );
  return ids.length > 0 ? ids : null;
}

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function describeWindows(): string {
  const { windows } = useOsStore.getState();
  if (windows.length === 0) return "No windows are open.";
  return (
    "Open windows: " +
    windows
      .map(
        (w) =>
          `${apps[w.id].title}${w.minimized ? " (minimized)" : ""} at (${Math.round(w.x)}, ${Math.round(w.y)}) ${Math.round(w.width)}px wide`,
      )
      .join("; ") +
    "."
  );
}

export const systemCommands: SystemCommand[] = [
  {
    name: "open_app",
    description:
      "Open a System app window (or restore and focus it if it is already open).",
    parameters: {
      type: "object",
      properties: { app: APP_ENUM },
      required: ["app"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      if (!app) return badApp(args.app);
      useOsStore.getState().open(app);
      return `${apps[app].title} is now open and focused. ${describeWindows()}`;
    },
  },
  {
    name: "close_app",
    description: "Close a System app window.",
    parameters: {
      type: "object",
      properties: { app: APP_ENUM },
      required: ["app"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      if (!app) return badApp(args.app);
      useOsStore.getState().close(app);
      return `${apps[app].title} is closed. ${describeWindows()}`;
    },
  },
  {
    name: "close_all_apps",
    description: "Close every open window, leaving the stage empty.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: () => {
      useOsStore.getState().closeAll();
      return "All windows are closed; the stage is empty.";
    },
  },
  {
    name: "focus_app",
    description:
      "Bring an open window to the front without moving or resizing it.",
    parameters: {
      type: "object",
      properties: { app: APP_ENUM },
      required: ["app"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      if (!app) return badApp(args.app);
      useOsStore.getState().focus(app);
      return `${apps[app].title} is focused (frontmost).`;
    },
  },
  {
    name: "minimize_app",
    description: "Minimize a window to the dock (it stays open).",
    parameters: {
      type: "object",
      properties: { app: APP_ENUM },
      required: ["app"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      if (!app) return badApp(args.app);
      useOsStore.getState().minimize(app);
      return `${apps[app].title} is minimized. ${describeWindows()}`;
    },
  },
  {
    name: "restore_app",
    description: "Restore a minimized window and bring it to the front.",
    parameters: {
      type: "object",
      properties: { app: APP_ENUM },
      required: ["app"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      if (!app) return badApp(args.app);
      useOsStore.getState().restore(app);
      return `${apps[app].title} is restored and focused.`;
    },
  },
  {
    name: "minimize_other_apps",
    description:
      "Minimize every open window except the listed ones — 'collapse everything else'.",
    parameters: {
      type: "object",
      properties: {
        keep: {
          type: "array",
          items: APP_ENUM,
          description: "Apps whose windows stay visible.",
        },
      },
      required: ["keep"],
      additionalProperties: false,
    },
    handler: (args) => {
      const keep = requireApps(args.keep);
      if (!keep) return badApp(args.keep);
      useOsStore.getState().minimizeOthers(keep);
      return `Everything except ${keep.map((id) => apps[id].title).join(" and ")} is minimized.`;
    },
  },
  {
    name: "restore_all_apps",
    description: "Restore every minimized window.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    handler: () => {
      useOsStore.getState().restoreAll();
      return `All windows are visible again. ${describeWindows()}`;
    },
  },
  {
    name: "move_window",
    description:
      "Move a window to stage coordinates (px from the stage's top-left). Positions are clamped so windows stay reachable.",
    parameters: {
      type: "object",
      properties: {
        app: APP_ENUM,
        x: { type: "number", description: "Left edge in px." },
        y: { type: "number", description: "Top edge in px." },
      },
      required: ["app", "x", "y"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      const x = num(args.x);
      const y = num(args.y);
      if (!app) return badApp(args.app);
      if (x === undefined || y === undefined)
        return "Both x and y must be finite numbers.";
      useOsStore.getState().move(app, x, y);
      const win = useOsStore.getState().windows.find((w) => w.id === app);
      if (!win) return `${apps[app].title} is not open — open it first.`;
      return `${apps[app].title} moved to (${Math.round(win.x)}, ${Math.round(win.y)}).`;
    },
  },
  {
    name: "resize_window",
    description:
      "Resize a window's width and/or content height in px (clamped to sane bounds). Set fitContent to let the height follow the content again.",
    parameters: {
      type: "object",
      properties: {
        app: APP_ENUM,
        width: { type: "number", description: "Frame width in px." },
        height: { type: "number", description: "Content height in px." },
        fitContent: {
          type: "boolean",
          description: "Reset height so the window sizes to its content.",
        },
      },
      required: ["app"],
      additionalProperties: false,
    },
    handler: (args) => {
      const app = requireApp(args);
      if (!app) return badApp(args.app);
      const width = num(args.width);
      const height = args.fitContent === true ? null : num(args.height);
      if (width === undefined && height === undefined)
        return "Provide width, height, or fitContent.";
      useOsStore.getState().resize(app, { width, height });
      const win = useOsStore.getState().windows.find((w) => w.id === app);
      if (!win) return `${apps[app].title} is not open — open it first.`;
      return `${apps[app].title} is now ${Math.round(win.width)}px wide${
        win.height == null
          ? " with content-fit height"
          : ` and ${Math.round(win.height)}px tall`
      }.`;
    },
  },
  {
    name: "arrange_windows",
    description:
      "Lay out the given apps on the stage, opening them if needed. Layout 'row' tiles them side by side, 'stack' piles them centered, 'cascade' staggers them. exclusive=true minimizes everything else.",
    parameters: {
      type: "object",
      properties: {
        apps: {
          type: "array",
          items: APP_ENUM,
          minItems: 1,
          description: "Apps to arrange, left to right.",
        },
        layout: {
          type: "string",
          enum: ["row", "stack", "cascade"],
          description: "Tiling strategy (default row).",
        },
        exclusive: {
          type: "boolean",
          description: "Minimize every window not listed (default false).",
        },
      },
      required: ["apps"],
      additionalProperties: false,
    },
    handler: (args) => {
      const ids = requireApps(args.apps);
      if (!ids) return badApp(args.apps);
      const layout: ArrangeLayout =
        args.layout === "stack" || args.layout === "cascade"
          ? args.layout
          : "row";
      useOsStore.getState().arrange(ids, layout, {
        exclusive: args.exclusive === true,
      });
      return `Arranged ${ids.map((id) => apps[id].title).join(", ")} in a ${layout}${
        args.exclusive === true ? ", everything else minimized" : ""
      }. ${describeWindows()}`;
    },
  },
  {
    name: "set_sound",
    description: "Mute or unmute the System's interface sounds.",
    parameters: {
      type: "object",
      properties: {
        muted: { type: "boolean", description: "true = silence the System." },
      },
      required: ["muted"],
      additionalProperties: false,
    },
    handler: (args) => {
      if (typeof args.muted !== "boolean") return "muted must be a boolean.";
      useSoundStore.getState().setMuted(args.muted);
      return args.muted ? "System sounds muted." : "System sounds enabled.";
    },
  },
  {
    name: "set_fullscreen",
    description:
      "Enter or leave immersion (fullscreen) mode. Browsers may refuse outside a user gesture — the command is best-effort.",
    parameters: {
      type: "object",
      properties: {
        enabled: { type: "boolean", description: "true = fullscreen." },
      },
      required: ["enabled"],
      additionalProperties: false,
    },
    handler: (args) => {
      if (typeof args.enabled !== "boolean")
        return "enabled must be a boolean.";
      if (args.enabled) enterFullscreen();
      else exitFullscreen();
      return args.enabled
        ? "Requested immersion mode (the browser may require a user gesture)."
        : "Left immersion mode.";
    },
  },
];

const commandsByName = new Map(systemCommands.map((c) => [c.name, c]));

/** Single dispatch entry point — voice pipelines and V5 tool adapters route here. */
export function executeSystemCommand(
  name: string,
  args: Record<string, unknown> = {},
): string {
  const command = commandsByName.get(name);
  if (!command)
    return `Unknown command "${name}". Available: ${systemCommands
      .map((c) => c.name)
      .join(", ")}.`;
  return command.handler(args);
}
