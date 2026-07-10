import type { Env } from "./types.js";

export type RateLimitRule = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
};

type Counter = { count: number; resetAt: number };

/** In-memory fallback when KV is unavailable (single-isolate best-effort). */
const memoryCounters = new Map<string, Counter>();

function ruleForPath(pathname: string): RateLimitRule {
  if (/^\/api\/sessions\/[^/]+\/status$/.test(pathname)) {
    return { windowMs: 60_000, max: 120 };
  }
  if (pathname.includes("/exec") || pathname.includes("/chat")) {
    return { windowMs: 60_000, max: 30 };
  }
  if (pathname.includes("/import/github") || pathname.endsWith("/upload")) {
    return { windowMs: 60_000, max: 20 };
  }
  if (/^\/api\/sessions\/[^/]+\/auth\/github\/repos$/.test(pathname)) {
    return { windowMs: 60_000, max: 15 };
  }
  return { windowMs: 60_000, max: 300 };
}

function clientKey(request: Request, sessionId?: string | null): string {
  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown";
  return sessionId ? `${ip}:${sessionId}` : ip;
}

async function incrementCounter(
  env: Env,
  key: string,
  rule: RateLimitRule,
  now: number,
): Promise<Counter> {
  const kvKey = `rl:${key}`;
  if (env.SESSIONS) {
    const raw = await env.SESSIONS.get(kvKey);
    let counter: Counter = raw
      ? (JSON.parse(raw) as Counter)
      : { count: 0, resetAt: now + rule.windowMs };
    if (now >= counter.resetAt) {
      counter = { count: 0, resetAt: now + rule.windowMs };
    }
    counter.count += 1;
    const ttl = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
    await env.SESSIONS.put(kvKey, JSON.stringify(counter), { expirationTtl: ttl });
    return counter;
  }

  let counter = memoryCounters.get(kvKey);
  if (!counter || now >= counter.resetAt) {
    counter = { count: 0, resetAt: now + rule.windowMs };
  }
  counter.count += 1;
  memoryCounters.set(kvKey, counter);
  return counter;
}

export async function checkRateLimit(
  env: Env,
  request: Request,
  pathname: string,
  sessionId?: string | null,
): Promise<RateLimitResult> {
  const rule = ruleForPath(pathname);
  const key = `${pathname}:${clientKey(request, sessionId)}`;
  const now = Date.now();
  const counter = await incrementCounter(env, key, rule, now);
  const remaining = Math.max(0, rule.max - counter.count);
  const retryAfterSec = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));

  return {
    allowed: counter.count <= rule.max,
    limit: rule.max,
    remaining,
    retryAfterSec,
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please wait a moment and try again.",
      retryAfterSec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    },
  );
}
