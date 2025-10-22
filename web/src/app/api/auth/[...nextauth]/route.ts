import { handlers } from "../../../../../auth.runtime";

// ✅ Next.js の Route は「関数」を直接エクスポートする必要あり
export const GET = handlers.GET;
export const POST = handlers.POST;

// Prisma を使うために Node.js ランタイムを明示
export const runtime = "nodejs";
