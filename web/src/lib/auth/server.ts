import "server-only";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";

export { readUserFromCookie } from "../auth-legacy";

export async function getUserFromCookies() {
  return _readUserFromCookie();
}
