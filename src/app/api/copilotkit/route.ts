import { CopilotRuntime, createCopilotRuntimeHandler, InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import { OpenRouterTranscriptionService } from "@/agent/server/audio";
import { hasModelKey } from "@/agent/server/model";
import { clientIp, limited, reject } from "@/agent/server/rate-limit";
import { createSystemAgent, createVoiceAgent, SYSTEM_AGENT_ID, VOICE_AGENT_ID } from "@/agent/server/system-agent";

/**
 * ── COPILOTKIT RUNTIME (v2, single endpoint) ──────────────────
 * The browser's CopilotKit provider talks to this one POST route; the
 * runtime runs both Systems in-process and streams AG-UI events:
 *
 *  · `system`       — the text agent (world tools, dialogue window)
 *  · `system-voice` — the voice agent (talks, delegates tasks)
 *
 * plus `transcribe`: CopilotKit's speech-to-text route, served by
 * OpenRouter STT (`STT_MODEL_ID`).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const copilotRuntime = new CopilotRuntime({
  agents: { [SYSTEM_AGENT_ID]: createSystemAgent(), [VOICE_AGENT_ID]: createVoiceAgent() },
  runner: new InMemoryAgentRunner({ maxThreads: 300, maxRunsPerThread: 40, onConcurrentRun: "supersede" }),
  transcriptionService: new OpenRouterTranscriptionService(),
});

/* ── guards: this endpoint spends real tokens on a public site ── */

/** only what the chat and voice need — the in-memory thread routes list every visitor's threads */
const ALLOWED = new Set(["info", "agent/run", "agent/connect", "agent/stop", "transcribe"]);
/** a few seconds of base64 speech fit well under this */
const MAX_BODY = 3 * 1024 * 1024;
const WINDOW_MS = 10 * 60_000;
/** one spoken turn costs a voice run, a task run and a report run */
const BUDGET = { run: 60, transcribe: 40 };

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
  mode: "single-route",
  hooks: {
    onRequest: ({ request }) => {
      const length = Number(request.headers.get("content-length") ?? 0);
      if (length > MAX_BODY) throw reject(413, "Message too large for the System.");
    },
    onBeforeHandler: ({ request, route }) => {
      if (!ALLOWED.has(route.method)) throw reject(404, "Not found.");
      if (route.method !== "agent/run" && route.method !== "transcribe") return;
      if (!hasModelKey()) throw reject(503, "The System is dormant (no model key configured).");
      const bucket = route.method === "transcribe" ? "transcribe" : "run";
      if (limited(`${bucket}:${clientIp(request)}`, BUDGET[bucket], WINDOW_MS)) {
        throw reject(429, "The System needs a moment to recover its mana. Try again in a few minutes.");
      }
    },
  },
});

export const POST = (request: Request) => handler(request);
