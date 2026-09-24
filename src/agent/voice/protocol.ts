/**
 * ── VOICE ⇄ TEXT PROTOCOL ─────────────────────────────────────
 * The wire shapes between the two agents, shared by the server and
 * the browser:
 *
 *  voice agent ── CUSTOM "voice_task" {id, task} ──► browser queue
 *  browser ── "[VOICE TASK #n] …" user message ──► text agent (does it)
 *  browser ── "[TASK REPORT] …" user message ──► voice agent (says it)
 *
 * Pure and dependency-free (unit-tested with `node --test`).
 */

/** the AG-UI CUSTOM event name the delegate tool dispatches */
export const TASK_EVENT = "voice_task";

export const TASK_MAX = 600;
const RESULT_MAX = 500;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const VOICE_TASK = /^\[VOICE TASK #(\d+)\]\s*([\s\S]*)$/;

export function formatVoiceTask(n: number, task: string) {
  return `[VOICE TASK #${n}] ${task}`;
}

export function parseVoiceTask(content: string): { n: number; task: string } | null {
  const m = VOICE_TASK.exec(content);
  return m ? { n: Number(m[1]), task: m[2].trim() } : null;
}

export interface TaskReport {
  n: number;
  task: string;
  status: "done" | "failed";
  result: string;
}

const REPORT_TAG = "[TASK REPORT]";

/** one message for everything that finished while the voice was busy */
export function formatTaskReports(reports: TaskReport[]) {
  const body = reports
    .map((r) => `${r.n ? `#${r.n}` : "#—"} · ${r.status.toUpperCase()} · task: ${clip(r.task, 160)}\nresult: ${clip(r.result.trim() || "(no result)", RESULT_MAX)}`)
    .join("\n\n");
  return `${REPORT_TAG} (from the task engine, not the visitor)\n${body}`;
}

export function isTaskReport(content: string) {
  return content.startsWith(REPORT_TAG);
}

/** the payload of a TASK_EVENT, or null if it is not one */
export function parseTaskEvent(value: unknown): { id: string; task: string } | null {
  if (!value || typeof value !== "object") return null;
  const { id, task } = value as { id?: unknown; task?: unknown };
  if (typeof id !== "string" || typeof task !== "string" || !task.trim()) return null;
  return { id, task: task.trim().slice(0, TASK_MAX) };
}

const FORMATS: Record<string, string> = {
  webm: "webm",
  ogg: "ogg",
  mp4: "m4a",
  "x-m4a": "m4a",
  m4a: "m4a",
  mpeg: "mp3",
  mp3: "mp3",
  wav: "wav",
  "x-wav": "wav",
  flac: "flac",
  aac: "aac",
};

/** MediaRecorder mime type → OpenRouter `input_audio.format` */
export function audioFormat(mime: string) {
  const sub = mime.split(";")[0].trim().split("/")[1] ?? "";
  return FORMATS[sub] ?? "webm";
}
