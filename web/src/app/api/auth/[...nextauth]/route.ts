// web/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

// ← これが超重要（Edge ではなく Node.js で動かす）
export const runtime = "nodejs";

// 認証系はキャッシュ禁止で
export const dynamic = "force-dynamic";
export const revalidate = 0;
