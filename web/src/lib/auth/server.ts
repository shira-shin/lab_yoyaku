import "server-only";

export { auth, signIn, signOut } from "@/app/api/auth/[...nextauth]/route";
export { auth as getServerSession } from "@/app/api/auth/[...nextauth]/route";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
