import "server-only";

/**
 * Best-effort per-instance sliding windows keyed by bucket + IP
 * (serverless instances don't share them — the OpenRouter key's
 * credit limit is the real backstop).
 */

const hits = new Map<string, number[]>();

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
}

/** records one hit of `weight`; true once the window's budget is spent */
export function limited(key: string, budget: number, windowMs: number, weight = 1) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  for (let i = 0; i < weight; i++) recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    // drop idle visitors rather than resetting everyone's budget
    for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k);
  }
  return recent.length > budget;
}

export const reject = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });
