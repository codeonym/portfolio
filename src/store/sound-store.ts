import { create } from "zustand";

const MUTE_KEY = "system-muted";

interface SoundState {
  muted: boolean;
  /** sync from localStorage after mount (client only) */
  init: () => void;
  toggle: () => void;
}

export const useSoundStore = create<SoundState>((set, get) => ({
  muted: false,
  init: () => {
    set({ muted: localStorage.getItem(MUTE_KEY) === "1" });
  },
  toggle: () => {
    const muted = !get().muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    set({ muted });
  },
}));
