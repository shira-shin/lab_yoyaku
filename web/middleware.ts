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
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/cookies/delete",
  "/api/health",
  "/api/debug",
  "/api/debug/",
  "/api/debug/auth-user",
  "/api/debug/auth-force-set-password",
  "/api/debug/auth-upsert-user",
  "/favicon.ico",
];

function isPublicPath(pathname: string) {
  if (pathname === "/reset-password" || pathname.startsWith("/reset-password")) {
    return true;
  }
  if (pathname.startsWith("/api/auth/")) {
    return true;
  }
  return PUBLIC_PATHS.some((path) => {
    if (pathname === path) return true;
    if (path.endsWith("/")) {
      return pathname.startsWith(path);
    }
    return pathname.startsWith(`${path}/`);
  });
}

export function middleware(req: NextRequest) {
  const { pathname, host } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const vercelEnv = process.env.VERCEL_ENV;
  if (!isPublicPath(pathname) && baseUrl && vercelEnv === "production") {
    const base = new URL(baseUrl);
    if (host !== base.host) {
      const url = req.nextUrl.clone();
      url.host = base.host;
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
