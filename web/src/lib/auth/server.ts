import "server-only";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";

export { auth, signIn, signOut } from "@/app/api/auth/[...nextauth]/route";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
