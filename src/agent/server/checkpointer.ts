import "server-only";
import { MemorySaver, type Checkpoint, type CheckpointMetadata } from "@langchain/langgraph";
import type { RunnableConfig } from "@langchain/core/runnables";

/**
 * ── BOUNDED MEMORY ────────────────────────────────────────────
 * MemorySaver keeps every checkpoint of every thread for the life of
 * the process — on a warm serverless instance that only grows. This
 * one keeps the most recently written `maxThreads` conversations and
 * forgets the oldest; a forgotten visitor simply starts a fresh chat.
 */
export class BoundedMemorySaver extends MemorySaver {
  private readonly recent = new Map<string, true>();

  constructor(private readonly maxThreads: number) {
    super();
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata) {
    const threadId = config.configurable?.thread_id as string | undefined;
    if (threadId) {
      // re-insert so Map order tracks recency
      this.recent.delete(threadId);
      this.recent.set(threadId, true);
      while (this.recent.size > this.maxThreads) {
        const oldest = this.recent.keys().next().value as string;
        this.recent.delete(oldest);
        await this.deleteThread(oldest);
      }
    }
    return super.put(config, checkpoint, metadata);
  }
}
