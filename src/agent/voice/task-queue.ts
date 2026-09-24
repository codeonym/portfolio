/**
 * ── BACKGROUND TASK QUEUE ─────────────────────────────────────
 * The voice agent never waits for work: its `delegate_task` tool ACKs
 * at once and the task lands here. Tasks run strictly one at a time
 * (they all drive the same world), each settles exactly once, and a
 * settled task is reported back so the voice can tell the visitor.
 *
 * Pure and dependency-free (unit-tested with `node --test`).
 */

export type TaskStatus = "queued" | "running" | "done" | "failed";

export interface TaskRecord {
  id: string;
  /** 1-based, in arrival order — what the visitor sees and hears */
  n: number;
  task: string;
  status: TaskStatus;
  result?: string;
  queuedAt: number;
  settledAt?: number;
}

export interface TaskQueueOptions {
  /** does the work; resolves with a short result, throws on failure */
  execute: (task: TaskRecord) => Promise<string>;
  onChange?: (tasks: readonly TaskRecord[]) => void;
  onSettled?: (task: TaskRecord) => void;
  /** queued + running tasks allowed at once */
  maxPending?: number;
  /** records kept for display, finished ones dropped oldest-first */
  history?: number;
}

export class TaskQueue {
  private tasks: TaskRecord[] = [];
  private seen = new Set<string>();
  private count = 0;
  private running = false;
  private waiters: (() => void)[] = [];
  private readonly opts: Required<Omit<TaskQueueOptions, "onChange" | "onSettled">> & TaskQueueOptions;

  constructor(opts: TaskQueueOptions) {
    this.opts = { maxPending: 5, history: 8, ...opts };
  }

  /** "duplicate" for an id already seen (a replayed event), "full" past the pending cap */
  enqueue({ id, task }: { id: string; task: string }): "queued" | "duplicate" | "full" {
    if (this.seen.has(id)) return "duplicate";
    const pending = this.tasks.filter((t) => t.status === "queued" || t.status === "running").length;
    if (pending >= this.opts.maxPending) return "full";
    this.seen.add(id);
    this.tasks.push({ id, n: ++this.count, task, status: "queued", queuedAt: Date.now() });
    this.changed();
    void this.pump();
    return "queued";
  }

  snapshot(): readonly TaskRecord[] {
    return this.tasks.map((t) => ({ ...t }));
  }

  /** drop everything still waiting; the running task finishes */
  clear() {
    this.tasks = this.tasks.filter((t) => t.status !== "queued");
    this.changed();
  }

  /** resolves once nothing is queued or running */
  idle(): Promise<void> {
    if (!this.running && !this.tasks.some((t) => t.status === "queued")) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    for (let next = this.nextQueued(); next; next = this.nextQueued()) {
      next.status = "running";
      this.changed();
      try {
        next.result = await this.opts.execute({ ...next });
        next.status = "done";
      } catch (err) {
        next.result = err instanceof Error ? err.message : String(err);
        next.status = "failed";
      }
      next.settledAt = Date.now();
      this.trim();
      this.changed();
      this.opts.onSettled?.({ ...next });
    }
    this.running = false;
    this.waiters.splice(0).forEach((w) => w());
  }

  private nextQueued() {
    return this.tasks.find((t) => t.status === "queued");
  }

  private trim() {
    while (this.tasks.length > this.opts.history) {
      const i = this.tasks.findIndex((t) => t.status === "done" || t.status === "failed");
      if (i < 0) break;
      this.tasks.splice(i, 1);
    }
  }

  private changed() {
    this.opts.onChange?.(this.snapshot());
  }
}
