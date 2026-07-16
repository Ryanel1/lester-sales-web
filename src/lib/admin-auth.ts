import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function authorizePortalAdmin(request: NextRequest): Promise<{ user: User } | { error: string; status: number }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return { error: "Administrator authentication is not configured.", status: 503 };

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Administrator sign-in required.", status: 401 };

  const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email) return { error: "Administrator sign-in required.", status: 401 };

  const allowed = new Set(
    (process.env.PORTAL_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!allowed.has(data.user.email.toLowerCase())) return { error: "This login cannot publish portal content.", status: 403 };
  return { user: data.user };
}

export function isAdminAuthFailure(result: Awaited<ReturnType<typeof authorizePortalAdmin>>): result is { error: string; status: number } {
  return "error" in result;
}
