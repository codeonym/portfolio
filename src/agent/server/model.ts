import "server-only";
import { ChatOpenAI } from "@langchain/openai";

/**
 * ── THE SYSTEM'S MIND ─────────────────────────────────────────
 * OpenRouter speaks the OpenAI wire protocol, so the agent talks to
 * it through ChatOpenAI with a swapped base URL.
 *
 * The model id is resolved per request, never baked into the build:
 *   1. `MODEL_ID` in Vercel Edge Config (when `EDGE_CONFIG` is set) —
 *      edit it in the dashboard and the next message uses it, no
 *      redeploy at all;
 *   2. the `MODEL_ID` environment variable;
 *   3. the default below.
 */

export const OPENROUTER_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_MODEL_ID = "openai/gpt-oss-120b";

const EDGE_TTL_MS = 30_000;
let edgeCache: { at: number; id: string | null } | null = null;

/** reads one key from Edge Config over its REST endpoint (no SDK needed) */
async function readEdgeConfigModel(): Promise<string | null> {
  const conn = process.env.EDGE_CONFIG;
  if (!conn) return null;
  if (edgeCache && Date.now() - edgeCache.at < EDGE_TTL_MS) return edgeCache.id;
  let id: string | null = null;
  try {
    const url = new URL(conn);
    url.pathname = `${url.pathname.replace(/\/$/, "")}/item/MODEL_ID`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const value: unknown = await res.json();
      if (typeof value === "string" && value.trim()) id = value.trim();
    }
  } catch {
    // Edge Config unreachable — fall through to the environment
  }
  edgeCache = { at: Date.now(), id };
  return id;
}

export async function resolveModelId(): Promise<string> {
  return (await readEdgeConfigModel()) ?? process.env.MODEL_ID?.trim() ?? DEFAULT_MODEL_ID;
}

export function hasModelKey(): boolean {
  return !!process.env.OPEN_ROUTER_API_KEY;
}

/** attribution headers OpenRouter shows on its dashboard */
function attribution() {
  return {
    "HTTP-Referer": process.env.SITE_URL ?? "https://portfolio.codeonym.work",
    // header values must stay Latin-1 — no em dashes here
    "X-Title": "codeonym - The System",
  };
}

/** for the raw audio endpoints (no SDK) */
export function openRouterHeaders(): Record<string, string> {
  return { ...attribution(), authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY ?? ""}` };
}

export interface ChatModelOptions {
  temperature?: number;
  maxTokens?: number;
  /** reasoning effort for models that think (the voice can't wait long) */
  reasoningEffort?: "low" | "medium" | "high";
}

export function createChatModel(modelId: string, opts: ChatModelOptions = {}) {
  return new ChatOpenAI({
    model: modelId,
    apiKey: process.env.OPEN_ROUTER_API_KEY,
    temperature: opts.temperature ?? 0.55,
    maxTokens: opts.maxTokens ?? 1400,
    streaming: true,
    // OpenRouter only implements Chat Completions
    useResponsesApi: false,
    ...(opts.reasoningEffort ? { modelKwargs: { reasoning: { effort: opts.reasoningEffort } } } : {}),
    configuration: {
      baseURL: OPENROUTER_URL,
      defaultHeaders: attribution(),
    },
  });
}
