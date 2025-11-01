import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./src/lib/auth/cookies";

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/signup",
  "/reset-password",
  "/favicon.ico",
  "/api/health",
];

function isPublicPath(pathname: string) {
  if (pathname === "/login" || pathname.startsWith("/login")) {
    return true;
  }
  if (pathname === "/reset-password" || pathname.startsWith("/reset-password")) {
    return true;
  }
  if (pathname === "/api/cookies/delete") {
    return true;
  }
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return true;
  }
  if (pathname === "/api/debug" || pathname.startsWith("/api/debug/")) {
    return true;
  }
  return PUBLIC_PATHS.some((path) => pathname === path);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const baseUrl = process.env.BASE_URL;
  const vercelEnv = process.env.VERCEL_ENV;
  const requestHost = req.headers.get("host");
  if (baseUrl && vercelEnv === "production" && requestHost) {
    const base = new URL(baseUrl);
    if (requestHost === base.host && req.nextUrl.protocol !== base.protocol) {
      const url = req.nextUrl.clone();
      url.protocol = base.protocol;
      return NextResponse.redirect(url, 307);
    }
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|static/|public/|favicon\\.).*)"],
};
