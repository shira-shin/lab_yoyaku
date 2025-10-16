import "server-only";

export { auth, signIn, signOut, getServerSession } from "@/lib/auth";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
