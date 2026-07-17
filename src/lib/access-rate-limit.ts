import { createHmac } from "node:crypto";
import { logServerEvent } from "@/lib/server-log";
import { createPortalAdminClient } from "@/lib/supabase/server";

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

export function accessAttemptKey(clientKey: string, secret = process.env.PORTAL_SESSION_SECRET ?? "local-fallback") {
  return createHmac("sha256", secret).update(clientKey).digest("hex");
}

export async function isAccessBlockedDurable(clientKey: string, now = Date.now()) {
  const client = createPortalAdminClient();
  if (!client) return isAccessBlocked(clientKey, now);
  const { data, error } = await client.rpc("portal_access_is_blocked", {
    p_key_hash: accessAttemptKey(clientKey),
    p_now: new Date(now).toISOString(),
    p_max_attempts: MAX_ATTEMPTS,
  });
  if (!error) return data === true;
  logServerEvent("warn", { event: "portal_rate_limit_read_fallback", error });
  return isAccessBlocked(clientKey, now);
}

export async function recordFailedAccessDurable(clientKey: string, now = Date.now()) {
  const local = recordFailedAccess(clientKey, now);
  const client = createPortalAdminClient();
  if (!client) return local;
  const { data, error } = await client.rpc("portal_record_access_failure", {
    p_key_hash: accessAttemptKey(clientKey),
    p_now: new Date(now).toISOString(),
    p_window_seconds: WINDOW_MS / 1000,
    p_max_attempts: MAX_ATTEMPTS,
  });
  if (error) {
    logServerEvent("warn", { event: "portal_rate_limit_write_fallback", error });
    return local;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    count: typeof row?.attempt_count === "number" ? row.attempt_count : local.count,
    resetAt: typeof row?.window_reset_at === "string" ? Date.parse(row.window_reset_at) : local.resetAt,
  };
}

export async function clearFailedAccessDurable(clientKey: string) {
  clearFailedAccess(clientKey);
  const client = createPortalAdminClient();
  if (!client) return;
  const { error } = await client.rpc("portal_clear_access_failures", { p_key_hash: accessAttemptKey(clientKey) });
  if (error) logServerEvent("warn", { event: "portal_rate_limit_clear_failed", error });
}
