import "server-only";

import { getServerSession as nextGetServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const auth = () => nextGetServerSession(authOptions);
export const getServerSession = () => nextGetServerSession(authOptions);
export const getSessionServer = () => nextGetServerSession(authOptions);

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
