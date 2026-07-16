import { NextResponse } from "next/server";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/access", request.url), 303);
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
