import "server-only";

export { auth, signIn, signOut } from "@/lib/nextauth";
export { auth as getServerSession } from "@/lib/nextauth";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
