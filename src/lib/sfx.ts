import { useSoundStore } from "@/store/sound-store";

/**
 * Synthesized System UI sounds — pure Web Audio, no assets.
 * Every call is user-gesture driven, so autoplay policies are satisfied;
 * failures are swallowed (audio is decoration, never load-bearing).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (useSoundStore.getState().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  duration: number;
  endFreq?: number;
  type?: OscillatorType;
  gain?: number;
  when?: number;
}

function tone({
  freq,
  duration,
  endFreq,
  type = "triangle",
  gain = 0.05,
  when = 0,
}: Tone) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sfx = {
  /** window materializes */
  open() {
    tone({ freq: 420, endFreq: 880, duration: 0.14, gain: 0.055 });
    tone({ freq: 1760, duration: 0.06, type: "sine", gain: 0.02, when: 0.1 });
  },
  /** window dismissed */
  close() {
    tone({ freq: 700, endFreq: 280, duration: 0.16, gain: 0.05 });
  },
  /** window tucked away */
  minimize() {
    tone({ freq: 600, endFreq: 380, duration: 0.09, gain: 0.04 });
  },
  /** generic confirm tap */
  click() {
    tone({ freq: 1320, duration: 0.04, type: "square", gain: 0.02 });
  },
  /** faint focus tick */
  hover() {
    tone({ freq: 1900, duration: 0.02, type: "sine", gain: 0.01 });
  },
  /** ambient System notification chime */
  notify() {
    tone({ freq: 880, duration: 0.09, type: "sine", gain: 0.03 });
    tone({ freq: 1174, duration: 0.14, type: "sine", gain: 0.025, when: 0.08 });
  },
  /** the System rejects an action */
  deny() {
    tone({ freq: 220, endFreq: 160, duration: 0.18, type: "sawtooth", gain: 0.03 });
    tone({ freq: 110, duration: 0.12, type: "square", gain: 0.02, when: 0.02 });
  },
  /** entering the System */
  enter() {
    tone({ freq: 523, duration: 0.12, gain: 0.055 });
    tone({ freq: 784, duration: 0.16, gain: 0.055, when: 0.1 });
    tone({ freq: 1046, duration: 0.3, type: "sine", gain: 0.045, when: 0.22 });
  },
};
