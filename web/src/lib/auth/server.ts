import "server-only";

import { getAuthUser } from "../auth";
import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";

export { readUserFromCookie } from "../auth-legacy";

export async function auth() {
  const user = await getAuthUser();
  if (!user) return null;
  return { user };
}

export async function getAuthContext() {
  return auth();
}

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
