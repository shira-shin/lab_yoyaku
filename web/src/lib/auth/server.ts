import "server-only";

export { auth } from "@/auth";
export { auth as getServerSession } from "@/auth";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
