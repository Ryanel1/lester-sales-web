import { NextResponse, type NextRequest } from "next/server";
import {
  getPortalAuthConfig,
  PORTAL_SESSION_COOKIE,
  safeReturnPath,
  verifyPortalSessionToken,
} from "@/lib/portal-auth";

const PUBLIC_PATHS = ["/api/access", "/api/logout"];
const PUBLIC_PREFIXES = ["/_next/", "/catalogs/", "/admin", "/api/admin/"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const config = getPortalAuthConfig();
  if (config.state === "disabled") return NextResponse.next();

  if (config.state === "misconfigured") {
    if (pathname === "/access") return NextResponse.next();
    const accessUrl = new URL("/access", request.url);
    accessUrl.searchParams.set("reason", "configuration");
    return NextResponse.redirect(accessUrl);
  }

  const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  if (await verifyPortalSessionToken(token, config.secret)) {
    if (pathname === "/access") {
      return NextResponse.redirect(new URL(safeReturnPath(request.nextUrl.searchParams.get("next")), request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/access") return NextResponse.next();

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", safeReturnPath(`${pathname}${search}`));
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/:path*"],
};
