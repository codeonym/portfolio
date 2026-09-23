import { create } from "zustand";

/** last connection / run error from the CopilotKit link, shown in the dialogue */
export const useLinkStatus = create<{ error: string | null; setError: (error: string | null) => void }>((set) => ({
  error: null,
  setError: (error) => set({ error }),
}));
