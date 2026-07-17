type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function isAccessBlocked(key: string, now = Date.now()) {
  const attempt = attempts.get(key);
  if (!attempt || attempt.resetAt <= now) { attempts.delete(key); return false; }
  return attempt.count >= MAX_ATTEMPTS;
}

export function recordFailedAccess(key: string, now = Date.now()) {
  const current = attempts.get(key);
  const next = !current || current.resetAt <= now ? { count: 1, resetAt: now + WINDOW_MS } : { ...current, count: current.count + 1 };
  attempts.set(key, next);
  return next;
}

export function clearFailedAccess(key: string) { attempts.delete(key); }
