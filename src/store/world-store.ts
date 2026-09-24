import { create } from "zustand";
import { persist } from "zustand/middleware";
import { quests } from "@/config/quests.config";
import type { InspectTarget, Tone, ZoneId } from "@/config/types";
import {
  visitorQuests,
  world,
  xpPerLevel,
  zoneById,
  zoneIds,
} from "@/config/world.config";

/**
 * ── WORLD STATE ───────────────────────────────────────────────
 * Everything the HUD and the scene share. Per-frame data (the
 * Hunter's live position, joystick input) deliberately lives in
 * the mutable `live` object below instead — writing it into React
 * state 60×/s would re-render the whole HUD.
 */

export type Phase = "loading" | "title" | "world";
export type Quality = "high" | "medium" | "low";

export interface Toast {
  id: number;
  heading: string;
  body: string;
  tone: Tone;
}

/** per-frame channel between scene, input and HUD — never rendered directly */
export const live = {
  /** Hunter world position [x, z] and facing (radians) */
  hunter: { x: world.spawn[0], z: world.spawn[1], heading: Math.PI },
  /** is the Hunter currently moving */
  moving: false,
  /** analog input, -1..1 (keyboard + touch joystick merge here) */
  input: { x: 0, z: 0, run: false },
  /** camera yaw (radians) — movement input is relative to it */
  cameraYaw: 0,
  /** THE SYSTEM is generating — its wraith reads this every frame */
  agentBusy: false,
};

interface WorldState {
  phase: Phase;
  quality: Quality;
  muted: boolean;
  /** true on coarse-pointer / small screens — set once on mount */
  touch: boolean;

  /** click-to-move destination, [x, z] */
  target: [number, number] | null;
  /** zone whose panel opens as soon as the Hunter arrives */
  pending: ZoneId | null;
  /** zone whose trigger radius the Hunter is standing in */
  nearZone: ZoneId | null;
  /** zone whose panel is open (the camera frames its landmark) */
  panel: ZoneId | null;
  cvOpen: boolean;
  mapOpen: boolean;
  /** the dialogue window with THE SYSTEM (the agent) */
  dialogueOpen: boolean;
  inspect: InspectTarget | null;
  /** quest id currently mid-ARISE (animation playing) */
  rising: string | null;
  /** bumps whenever the Hunter should teleport (fast travel) */
  warp: { to: [number, number]; n: number };

  // ── persisted visitor progress ──
  visited: ZoneId[];
  risen: string[];
  completed: string[];
  xp: number;

  toasts: Toast[];
  /** level number when a LEVEL UP overlay should play, else null */
  levelUp: number | null;

  setPhase: (phase: Phase) => void;
  setQuality: (q: Quality) => void;
  toggleMuted: () => void;
  setTouch: (touch: boolean) => void;
  moveTo: (x: number, z: number) => void;
  /** walk to a zone and open its panel on arrival */
  goTo: (zone: ZoneId) => void;
  clearTarget: () => void;
  setNearZone: (zone: ZoneId | null) => void;
  openPanel: (zone: ZoneId) => void;
  closePanel: () => void;
  travelTo: (zone: ZoneId) => void;
  setMapOpen: (open: boolean) => void;
  setCvOpen: (open: boolean) => void;
  setDialogueOpen: (open: boolean) => void;
  setInspect: (target: InspectTarget | null) => void;
  arise: (questId: string) => void;
  finishRising: () => void;
  completeQuest: (id: string) => void;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  clearLevelUp: () => void;
  resetProgress: () => void;
}

let toastSeq = 0;

export function levelFor(xp: number) {
  return Math.floor(xp / xpPerLevel) + 1;
}

/** stand a few units in front of a zone (toward the island center) */
export function approachPoint(zone: ZoneId): [number, number] {
  const [x, z] = zoneById[zone].position;
  const len = Math.hypot(x, z);
  if (len < 1) return [0, 5.5];
  const back = zoneById[zone].radius * 0.7;
  return [x - (x / len) * back, z - (z / len) * back];
}

export const useWorldStore = create<WorldState>()(
  persist(
    (set, get) => ({
      phase: "loading",
      quality: "high",
      muted: false,
      touch: false,

      target: null,
      pending: null,
      nearZone: null,
      panel: null,
      cvOpen: false,
      mapOpen: false,
      dialogueOpen: false,
      inspect: null,
      rising: null,
      warp: { to: world.spawn, n: 0 },

      visited: [],
      risen: [],
      completed: [],
      xp: 0,

      toasts: [],
      levelUp: null,

      setPhase: (phase) => set({ phase }),
      setQuality: (quality) => set({ quality }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      setTouch: (touch) => set({ touch }),

      moveTo: (x, z) => {
        const r = Math.hypot(x, z);
        const max = world.islandRadius - 2;
        const k = r > max ? max / r : 1;
        set({ target: [x * k, z * k], pending: null });
      },
      goTo: (zone) => {
        if (get().nearZone === zone) return get().openPanel(zone);
        set({ target: approachPoint(zone), pending: zone, panel: null, inspect: null });
      },
      clearTarget: () => set({ target: null }),

      setNearZone: (nearZone) => {
        if (get().nearZone === nearZone) return;
        set({ nearZone });
        if (nearZone && get().pending === nearZone) get().openPanel(nearZone);
        if (!nearZone || get().visited.includes(nearZone)) return;
        const visited = [...get().visited, nearZone];
        set({ visited });
        get().pushToast({
          heading: world.toasts.zoneDiscovered,
          body: `${zoneById[nearZone].name} — ${zoneById[nearZone].epithet}`,
          tone: zoneById[nearZone].tone,
        });
        if (nearZone === "gate") get().completeQuest("party");
        if (zoneIds.every((id) => visited.includes(id))) get().completeQuest("explore");
      },

      openPanel: (zone) =>
        set({ panel: zone, target: null, pending: null, mapOpen: false, inspect: null }),
      closePanel: () => set({ panel: null, inspect: null }),

      travelTo: (zone) => {
        const to = approachPoint(zone);
        set((s) => ({
          warp: { to, n: s.warp.n + 1 },
          target: null,
          pending: null,
          mapOpen: false,
          panel: null,
          inspect: null,
        }));
      },

      setMapOpen: (mapOpen) => set({ mapOpen }),
      setCvOpen: (cvOpen) => {
        set({ cvOpen });
        if (cvOpen) get().completeQuest("license");
      },
      setDialogueOpen: (dialogueOpen) => set(dialogueOpen ? { dialogueOpen, mapOpen: false } : { dialogueOpen }),
      setInspect: (inspect) => {
        set({ inspect });
        if (inspect?.kind === "item" && inspect.id === "hunter-license") {
          get().completeQuest("license");
        }
      },

      arise: (questId) => {
        const { risen, rising } = get();
        if (rising || risen.includes(questId)) return;
        set({ rising: questId });
      },
      finishRising: () => {
        const { rising, risen } = get();
        if (!rising) return;
        const next = [...risen, rising];
        set({ rising: null, risen: next });
        const quest = quests.find((q) => q.id === rising);
        get().pushToast({
          heading: world.toasts.arise,
          body: `[ ${quest?.name ?? rising} ] ${world.toasts.ariseBody}`,
          tone: "arcane",
        });
        if (quests.every((q) => next.includes(q.id))) get().completeQuest("arise");
      },

      completeQuest: (id) => {
        const { completed, xp } = get();
        const quest = visitorQuests.find((q) => q.id === id);
        if (!quest || completed.includes(id)) return;
        const nextXp = xp + quest.xp;
        const before = levelFor(xp);
        const after = levelFor(nextXp);
        const done = [...completed, id];
        set({ completed: done, xp: nextXp, levelUp: after > before ? after : get().levelUp });
        get().pushToast({
          heading: world.toasts.questComplete,
          body: `${quest.name} — +${quest.xp} XP`,
          tone: "gold",
        });
        if (done.length === visitorQuests.length) {
          get().pushToast({ heading: "SYSTEM", body: world.toasts.allComplete, tone: "system" });
        }
      },

      pushToast: (toast) =>
        set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id: ++toastSeq }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      clearLevelUp: () => set({ levelUp: null }),
      resetProgress: () => set({ visited: [], risen: [], completed: [], xp: 0 }),
    }),
    {
      name: "codeonym-world-v5",
      // rehydrated after mount (WorldHud) so SSR and first client render match
      skipHydration: true,
      partialize: (s) => ({
        visited: s.visited,
        risen: s.risen,
        completed: s.completed,
        xp: s.xp,
        muted: s.muted,
        quality: s.quality,
      }),
    },
  ),
);
