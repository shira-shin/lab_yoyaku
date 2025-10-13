import { handlers } from "@/auth";

// NextAuth v5 (App Router): handlers から GET/POST をそのままエクスポート
export const { GET, POST } = handlers;