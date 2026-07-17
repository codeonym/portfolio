import { create } from "zustand";
import type { AppId } from "@/config/apps.config";
import { apps } from "@/config/apps.config";

export interface OsWindow {
  id: AppId;
  x: number;
  y: number;
  z: number;
  minimized: boolean;
}

/** Topmost non-minimized window, or undefined when the stage is empty. */
export function topVisibleWindow(windows: OsWindow[]): OsWindow | undefined {
  const visible = windows.filter((w) => !w.minimized);
  if (visible.length === 0) return undefined;
  return visible.reduce((a, b) => (a.z > b.z ? a : b));
}

interface OsState {
  windows: OsWindow[];
  zCounter: number;
  open: (id: AppId) => void;
  close: (id: AppId) => void;
  focus: (id: AppId) => void;
  move: (id: AppId, x: number, y: number) => void;
  toggleMinimize: (id: AppId) => void;
  closeTop: () => void;
}

export const useOsStore = create<OsState>((set) => ({
  windows: [],
  zCounter: 1,

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
      const { x, y } = apps[id].defaultPosition;
      // cascade slightly so re-opened stacks don't align perfectly
      const offset = (s.windows.length % 4) * 16;
      return {
        zCounter: z,
        windows: [
          ...s.windows,
          { id, x: x + offset, y: y + offset, z, minimized: false },
        ],
      };
    }),

  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focus: (id) =>
    set((s) => {
      const z = s.zCounter + 1;
      return {
        zCounter: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z } : w)),
      };
    }),

  move: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  toggleMinimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w,
      ),
    })),

  closeTop: () =>
    set((s) => {
      const top = topVisibleWindow(s.windows);
      if (!top) return s;
      return { windows: s.windows.filter((w) => w.id !== top.id) };
    }),
}));
