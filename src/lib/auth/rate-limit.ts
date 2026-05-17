const ipAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const DEV_IP = "unknown";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();

  if (ip === DEV_IP) {
    return { allowed: true, remaining: MAX_ATTEMPTS, resetAt: now + WINDOW_MS };
  }

  const entry = ipAttempts.get(ip);

  if (!entry || now >= entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    resetAt: entry.resetAt,
  };
}

export function resetRateLimit(ip: string) {
  ipAttempts.delete(ip);
}
