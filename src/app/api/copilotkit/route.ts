import { CopilotRuntime, createCopilotRuntimeHandler, InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import { createSystemAgent, SYSTEM_AGENT_ID } from "@/agent/server/system-agent";
import { hasModelKey } from "@/agent/server/model";

/**
 * ── COPILOTKIT RUNTIME (v2, single endpoint) ──────────────────
 * The browser's CopilotKit provider talks to this one POST route; the
 * runtime runs the System agent in-process and streams AG-UI events.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const copilotRuntime = new CopilotRuntime({
  agents: { [SYSTEM_AGENT_ID]: createSystemAgent() },
  runner: new InMemoryAgentRunner({ maxThreads: 300, maxRunsPerThread: 40, onConcurrentRun: "supersede" }),
});

/* ── guards: this endpoint spends real tokens on a public site ── */

/** only what the chat needs — the in-memory thread routes list every visitor's threads */
const ALLOWED = new Set(["info", "agent/run", "agent/connect", "agent/stop"]);
const MAX_BODY = 384 * 1024;
const WINDOW_MS = 10 * 60_000;
const RUNS_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/** best-effort per-instance sliding window (serverless instances don't share it) */
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    // drop idle visitors rather than resetting everyone's budget
    for (const [key, times] of hits) if (now - times[times.length - 1] >= WINDOW_MS) hits.delete(key);
  }
  return recent.length > RUNS_PER_WINDOW;
}

const reject = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });

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
      if (route.method !== "agent/run") return;
      if (!hasModelKey()) throw reject(503, "The System is dormant (no model key configured).");
      if (limited(clientIp(request))) throw reject(429, "The System needs a moment to recover its mana. Try again in a few minutes.");
    },
  },
});

export const POST = (request: Request) => handler(request);
