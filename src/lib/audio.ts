import { useWorldStore } from "@/store/world-store";

/**
 * World audio — CC0 samples (Kenney) + an ambient loop (OpenGameArt, CC0).
 * Buffers are fetched lazily on first use; everything fails silently,
 * audio is decoration and never load-bearing.
 */

const SOUNDS = {
  hover: "/audio/hover.mp3",
  click: "/audio/click.mp3",
  open: "/audio/open.mp3",
  close: "/audio/close.mp3",
  confirm: "/audio/confirm.mp3",
  levelup: "/audio/levelup.mp3",
  error: "/audio/error.mp3",
  glitch: "/audio/glitch.mp3",
  portal: "/audio/portal.mp3",
  arise: "/audio/arise.mp3",
  system: "/audio/system.mp3",
  book: "/audio/book.mp3",
  coins: "/audio/coins.mp3",
  chest: "/audio/chest.mp3",
  blade: "/audio/blade.mp3",
  step0: "/audio/step-00.mp3",
  step1: "/audio/step-03.mp3",
  step2: "/audio/step-05.mp3",
  step3: "/audio/step-08.mp3",
} as const;

export type SoundId = keyof typeof SOUNDS;

const VOLUME: Partial<Record<SoundId, number>> = {
  hover: 0.25,
  step0: 0.18,
  step1: 0.18,
  step2: 0.18,
  step3: 0.18,
  arise: 0.9,
  portal: 0.5,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<SoundId, Promise<AudioBuffer | null>>();
let music: { el: HTMLAudioElement; node: MediaElementAudioSourceNode; gain: GainNode } | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
      master.gain.value = useWorldStore.getState().muted ? 0 : 1;
      useWorldStore.subscribe((s, prev) => {
        if (s.muted === prev.muted || !ctx || !master) return;
        master.gain.setTargetAtTime(s.muted ? 0 : 1, ctx.currentTime, 0.08);
      });
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function load(id: SoundId): Promise<AudioBuffer | null> {
  let pending = buffers.get(id);
  if (!pending) {
    pending = fetch(SOUNDS[id])
      .then((r) => r.arrayBuffer())
      .then((data) => context()?.decodeAudioData(data) ?? null)
      .catch(() => null);
    buffers.set(id, pending);
  }
  return pending;
}

export function play(id: SoundId, opts: { volume?: number; rate?: number } = {}) {
  const ac = context();
  if (!ac || !master || useWorldStore.getState().muted) return;
  void load(id).then((buffer) => {
    if (!buffer || !master) return;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = opts.rate ?? 1;
    const gain = ac.createGain();
    gain.gain.value = opts.volume ?? VOLUME[id] ?? 0.6;
    src.connect(gain).connect(master);
    src.start();
  });
}

let stepIndex = 0;
export function footstep() {
  const id = (["step0", "step1", "step2", "step3"] as const)[stepIndex++ % 4];
  play(id, { rate: 0.9 + Math.random() * 0.2 });
}

/** warm the cache for sounds that must fire without latency */
export function preloadSounds() {
  if (!context()) return;
  (Object.keys(SOUNDS) as SoundId[]).forEach((id) => void load(id));
}

/** start (or resume) the ambient loop with a slow fade-in; call from a gesture */
export function startMusic() {
  const ac = context();
  if (!ac || !master) return;
  if (!music) {
    const el = new Audio("/audio/ambient.mp3");
    el.loop = true;
    el.crossOrigin = "anonymous";
    const node = ac.createMediaElementSource(el);
    const gain = ac.createGain();
    gain.gain.value = 0;
    node.connect(gain).connect(master);
    music = { el, node, gain };
  }
  void music.el.play().catch(() => {});
  music.gain.gain.cancelScheduledValues(ac.currentTime);
  music.gain.gain.setTargetAtTime(0.32, ac.currentTime, 1.6);
}

/** duck the music under big moments (ARISE, level up) */
export function duckMusic(seconds = 2.5) {
  if (!ctx || !music) return;
  const g = music.gain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setTargetAtTime(0.08, ctx.currentTime, 0.1);
  g.setTargetAtTime(0.32, ctx.currentTime + seconds, 0.8);
}
