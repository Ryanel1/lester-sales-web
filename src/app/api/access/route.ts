import { NextResponse } from "next/server";
import {
  createPortalSessionToken,
  getPortalAuthConfig,
  passwordMatches,
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_SECONDS,
  safeReturnPath,
} from "@/lib/portal-auth";

function accessRedirect(request: Request, params: Record<string, string>) {
  const url = new URL("/access", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password");
  const returnPath = safeReturnPath(formData.get("next"));
  const config = getPortalAuthConfig();

  if (config.state === "disabled") return NextResponse.redirect(new URL(returnPath, request.url), 303);
  if (config.state === "misconfigured") return accessRedirect(request, { reason: "configuration" });

  const isValid = typeof password === "string" && password.length <= 512 && await passwordMatches(password, config.password, config.secret);
  if (!isValid) return accessRedirect(request, { error: "invalid", next: returnPath });

  const response = NextResponse.redirect(new URL(returnPath, request.url), 303);
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: await createPortalSessionToken(config.secret),
    httpOnly: true,
    maxAge: PORTAL_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
