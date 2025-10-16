import "server-only";

import { getServerSession as nextAuthGetServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function auth() {
  return nextAuthGetServerSession(authOptions);
}

export { auth as getServerSession };

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
