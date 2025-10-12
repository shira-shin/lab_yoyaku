export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { handlers } from "@/auth";

// Route は GET/POST だけを公開
export const { GET, POST } = handlers;
