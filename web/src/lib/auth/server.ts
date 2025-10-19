
﻿import "server-only";
import "server-only";

import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";

export { readUserFromCookie } from "../auth-legacy";

// NextAuth v5 helpers
export { auth } from "@/auth";
export { auth as getServerSession } from "@/auth";

// Legacy cookie/session helper
// 1) モジュール内で使うために import（別名）
import { readUserFromCookie as _readUserFromCookie } from "../auth-legacy";
// 2) 既存の呼び出し元向けに再エクスポートも維持
export { readUserFromCookie } from "../auth-legacy";

// 既存コードが使っているかもしれない便宜関数
export async function getUserFromCookies() {
  return _readUserFromCookie();
}
