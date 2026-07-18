import { create } from "zustand";
import type { AppId } from "@/config/apps.config";
import { apps } from "@/config/apps.config";
import type { InspectTarget } from "@/config/types";

/**
 * ── WINDOW MANAGER ────────────────────────────────────────────
 * Single source of truth for every System window: geometry
 * (x/y/z, width, height), minimize state and stacking order.
 * Every action is exposed to AI agents through src/agent, so all
 * of them are idempotent and safe to call with stale state
 * (open on an open window refocuses it, restore on a visible
 * window is a no-op, geometry is always clamped to the stage).
 */

export interface OsWindow {
  id: AppId;
  x: number;
  y: number;
  z: number;
  /** frame width in px */
  width: number;
  /** content height override in px; null = size to content */
  height: number | null;
  minimized: boolean;
}

export type ArrangeLayout = "row" | "cascade" | "stack";

export interface StageSize {
  width: number;
  height: number;
}

/** geometry limits — windows stay reachable whatever an agent asks for */
const MIN_WIDTH = 360;
const MAX_WIDTH = 1100;
const MIN_HEIGHT = 220;
const MARGIN = 16;
/** px of title bar that must stay on stage so a window can't be lost */
const GRAB_ZONE = 48;
/** fallback stage before the first ResizeObserver tick (SSR, tests) */
const FALLBACK_STAGE: StageSize = { width: 1280, height: 720 };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Topmost non-minimized window, or undefined when the stage is empty. */
export function topVisibleWindow(windows: OsWindow[]): OsWindow | undefined {
  const visible = windows.filter((w) => !w.minimized);
  if (visible.length === 0) return undefined;
  return visible.reduce((a, b) => (a.z > b.z ? a : b));
}

interface OsState {
  windows: OsWindow[];
  zCounter: number;
  /** live size of the window stage, reported by SystemOS */
  stage: StageSize;
  setStageSize: (size: StageSize) => void;

  /** what the INFO window is showing; survives close/reopen */
  inspectTarget: InspectTarget | null;
  /** retarget the INFO window and bring it up */
  inspect: (target: InspectTarget) => void;

  open: (id: AppId) => void;
  close: (id: AppId) => void;
  closeAll: () => void;
  closeOthers: (keep: AppId[]) => void;
  closeTop: () => void;
  focus: (id: AppId) => void;
  minimize: (id: AppId) => void;
  restore: (id: AppId) => void;
  toggleMinimize: (id: AppId) => void;
  minimizeOthers: (keep: AppId[]) => void;
  restoreAll: () => void;
  move: (id: AppId, x: number, y: number) => void;
  resize: (
    id: AppId,
    size: { width?: number; height?: number | null },
  ) => void;
  /**
   * Tile the given apps on the stage (opening/restoring them first).
   * "row" splits the stage into side-by-side columns, "cascade"
   * staggers them, "stack" piles them centered. `exclusive`
   * minimizes every other open window.
   */
  arrange: (
    ids: AppId[],
    layout?: ArrangeLayout,
    options?: { exclusive?: boolean },
  ) => void;
}

function stageOf(stage: StageSize): StageSize {
  return stage.width > 0 && stage.height > 0 ? stage : FALLBACK_STAGE;
}

function clampGeometry(
  win: OsWindow,
  stage: StageSize,
): OsWindow {
  const s = stageOf(stage);
  const width = clamp(win.width, MIN_WIDTH, Math.min(MAX_WIDTH, s.width - 2 * MARGIN));
  const height =
    win.height == null
      ? null
      : clamp(win.height, MIN_HEIGHT, s.height - 2 * MARGIN - GRAB_ZONE);
  return {
    ...win,
    width,
    height,
    x: clamp(win.x, MARGIN - width + GRAB_ZONE, s.width - GRAB_ZONE),
    y: clamp(win.y, 0, s.height - GRAB_ZONE),
  };
}

function spawnWindow(
  id: AppId,
  z: number,
  cascadeStep: number,
  stage: StageSize,
): OsWindow {
  const def = apps[id];
  // cascade slightly so re-opened stacks don't align perfectly
  const offset = (cascadeStep % 4) * 16;
  return clampGeometry(
    {
      id,
      x: def.defaultPosition.x + offset,
      y: def.defaultPosition.y + offset,
      z,
      width: def.width,
      height: def.defaultHeight ?? null,
      minimized: false,
    },
    stage,
  );
}

export const useOsStore = create<OsState>((set, get) => ({
  windows: [],
  zCounter: 1,
  stage: { width: 0, height: 0 },

  inspectTarget: null,
  inspect: (target) => {
    set({ inspectTarget: target });
    get().open("inspect");
  },

  setStageSize: (size) =>
    set((s) => ({
      stage: size,
      // keep every window reachable when the stage shrinks
      windows: s.windows.map((w) => clampGeometry(w, size)),
    })),

  open: (id) =>
    set((s) => {
      const existing = s.windows.find((w) => w.id === id);
      const z = s.zCounter + 1;
      if (existing) {
        return {
          zCounter: z,
          windows: s.windows.map((w) =>
            w.id === id ? { ...w, minimized: false, z } : w,
          ),
        };
      }
      return {
        zCounter: z,
        windows: [...s.windows, spawnWindow(id, z, s.windows.length, s.stage)],
      };
    }),

  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  closeAll: () => set({ windows: [] }),

  closeOthers: (keep) =>
    set((s) => ({
      windows: s.windows.filter((w) => keep.includes(w.id)),
    })),

  closeTop: () =>
    set((s) => {
      const top = topVisibleWindow(s.windows);
      if (!top) return s;
      return { windows: s.windows.filter((w) => w.id !== top.id) };
    }),

  focus: (id) =>
    set((s) => {
      const z = s.zCounter + 1;
      return {
        zCounter: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)),
      };
    }),

  minimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      ),
    })),

  restore: (id) =>
    set((s) => {
      const z = s.zCounter + 1;
      return {
        zCounter: z,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, minimized: false, z } : w,
        ),
      };
    }),

  toggleMinimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w,
      ),
    })),

  minimizeOthers: (keep) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        keep.includes(w.id) ? w : { ...w, minimized: true },
      ),
    })),

  restoreAll: () =>
    set((s) => ({
      windows: s.windows.map((w) => ({ ...w, minimized: false })),
    })),

  move: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? clampGeometry({ ...w, x, y }, s.stage) : w,
      ),
    })),

  resize: (id, size) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id
          ? clampGeometry(
              {
                ...w,
                width: size.width ?? w.width,
                height: size.height === undefined ? w.height : size.height,
              },
              s.stage,
            )
          : w,
      ),
    })),

  arrange: (ids, layout = "row", options) =>
    set((s) => {
      const targets = ids.filter((id) => id in apps);
      if (targets.length === 0) return s;

      const stage = stageOf(s.stage);
      let z = s.zCounter;
      const byId = new Map(s.windows.map((w) => [w.id, w]));

      // geometry per target, keyed by position in the arrangement
      const placed = targets.map((id, i) => {
        const def = apps[id];
        const base: OsWindow = byId.get(id) ?? {
          id,
          x: 0,
          y: 0,
          z: 0,
          width: def.width,
          height: def.defaultHeight ?? null,
          minimized: false,
        };
        z += 1;

        if (layout === "row") {
          const n = targets.length;
          const width = clamp(
            (stage.width - MARGIN * (n + 1)) / n,
            MIN_WIDTH,
            MAX_WIDTH,
          );
          return clampGeometry(
            {
              ...base,
              minimized: false,
              z,
              width,
              height: stage.height - 2 * MARGIN - GRAB_ZONE,
              x: MARGIN + i * (width + MARGIN),
              y: MARGIN,
            },
            stage,
          );
        }

        if (layout === "stack") {
          return clampGeometry(
            {
              ...base,
              minimized: false,
              z,
              x: (stage.width - base.width) / 2 + i * 12,
              y: MARGIN * 2 + i * 12,
            },
            stage,
          );
        }

        // cascade
        return clampGeometry(
          {
            ...base,
            minimized: false,
            z,
            x: MARGIN * 3 + i * 56,
            y: MARGIN + i * 48,
          },
          stage,
        );
      });

      const placedIds = new Set(targets);
      const rest = s.windows
        .filter((w) => !placedIds.has(w.id))
        .map((w) =>
          options?.exclusive ? { ...w, minimized: true } : w,
        );

      return { zCounter: z, windows: [...rest, ...placed] };
    }),
}));
