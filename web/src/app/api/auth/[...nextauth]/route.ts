import { handlers } from "@/auth";

// v5 は handlers を“そのまま”再エクスポートだけ
export const { GET, POST } = handlers;

// ここが超重要：Edge ではなく Node で固定
export const runtime = "nodejs";

// (静的最適化を避ける保険：必要に応じて)
// export const dynamic = "force-dynamic";
