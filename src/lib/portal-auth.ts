const encoder = new TextEncoder();

export const PORTAL_SESSION_COOKIE = "lester_portal_session";
export const PORTAL_SESSION_TTL_SECONDS = 60 * 60 * 12;

type PortalAuthConfig =
  | { state: "configured"; password: string; secret: string }
  | { state: "disabled" }
  | { state: "misconfigured" };

export function getPortalAuthConfig(): PortalAuthConfig {
  const password = process.env.PORTAL_PASSWORD;
  const secret = process.env.PORTAL_SESSION_SECRET;

  if (password && secret) return { state: "configured", password, secret };
  if (process.env.NODE_ENV !== "production" && !password && !secret) return { state: "disabled" };
  return { state: "misconfigured" };
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToHex(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return mismatch === 0;
}

export async function passwordMatches(candidate: string, expected: string, secret: string) {
  const [candidateSignature, expectedSignature] = await Promise.all([
    sign(`password:${candidate}`, secret),
    sign(`password:${expected}`, secret),
  ]);
  return constantTimeEqual(candidateSignature, expectedSignature);
}

export async function createPortalSessionToken(secret: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + PORTAL_SESSION_TTL_SECONDS;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifyPortalSessionToken(token: string | undefined, secret: string, now = Date.now()) {
  if (!token) return false;

  const [version, expiresAtValue, suppliedSignature, ...extra] = token.split(".");
  if (version !== "v1" || extra.length || !/^\d+$/.test(expiresAtValue) || !/^[a-f0-9]{64}$/.test(suppliedSignature)) {
    return false;
  }

  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / 1000)) return false;

  const payload = `${version}.${expiresAtValue}`;
  const expectedSignature = await sign(payload, secret);
  return constantTimeEqual(suppliedSignature, expectedSignature);
}

export function safeReturnPath(value: FormDataEntryValue | string | null | undefined) {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return "/";
  }

  const returnUrl = new URL(value, "https://portal.invalid");
  if (returnUrl.origin !== "https://portal.invalid") return "/";
  if (returnUrl.pathname === "/access" || returnUrl.pathname.startsWith("/api/")) return "/";
  return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
}
