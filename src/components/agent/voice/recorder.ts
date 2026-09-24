/**
 * Hold-to-talk recorder: the mic stream stays open for a short while
 * after each turn (re-asking getUserMedia per press adds latency and
 * flickers the browser's mic indicator), then is released.
 */

const MIME_PREFERENCE = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
/** shorter holds are a tap, not speech */
const MIN_MS = 350;
/** a held key shouldn't record forever */
export const MAX_MS = 30_000;
const RELEASE_AFTER_MS = 20_000;

export function canRecord() {
  return typeof window !== "undefined" && window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export class HoldRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private takes = new WeakMap<MediaRecorder, Blob[]>();
  private startedAt = 0;
  private releaseTimer = 0;
  private audio: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private samples: Uint8Array<ArrayBuffer> | null = null;

  /** throws DOMException "NotAllowedError" when the mic is refused */
  async start() {
    window.clearTimeout(this.releaseTimer);
    if (!this.stream || this.stream.getAudioTracks().every((t) => t.readyState === "ended")) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.meter(this.stream);
    }
    const mimeType = MIME_PREFERENCE.find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
    // each take owns its chunks — a quick re-press must not splice the previous take in
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    this.takes.set(recorder, chunks);
    this.recorder = recorder;
    recorder.start();
    this.startedAt = performance.now();
  }

  get recording() {
    return this.recorder?.state === "recording";
  }

  /** the take, or null when it was only a tap */
  stop(): Promise<Blob | null> {
    const rec = this.recorder;
    this.recorder = null;
    this.scheduleRelease();
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    const long = performance.now() - this.startedAt >= MIN_MS;
    const chunks = this.takes.get(rec) ?? [];
    return new Promise((resolve) => {
      rec.onstop = () => resolve(long && chunks.length ? new Blob(chunks, { type: rec.mimeType || "audio/webm" }) : null);
      rec.stop();
    });
  }

  /** 0..1 RMS loudness of the mic right now */
  level() {
    if (!this.analyser || !this.samples) return 0;
    this.analyser.getByteTimeDomainData(this.samples);
    let sum = 0;
    for (const v of this.samples) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / this.samples.length) * 4);
  }

  dispose() {
    window.clearTimeout(this.releaseTimer);
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.releaseStream();
    void this.audio?.close().catch(() => {});
    this.audio = null;
  }

  private meter(stream: MediaStream) {
    try {
      this.audio ??= new AudioContext();
      const analyser = this.audio.createAnalyser();
      analyser.fftSize = 512;
      this.audio.createMediaStreamSource(stream).connect(analyser);
      this.analyser = analyser;
      this.samples = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      if (this.audio.state === "suspended") void this.audio.resume();
    } catch {
      this.analyser = null; // metering is decoration
    }
  }

  private scheduleRelease() {
    window.clearTimeout(this.releaseTimer);
    this.releaseTimer = window.setTimeout(() => this.releaseStream(), RELEASE_AFTER_MS);
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
  }
}
