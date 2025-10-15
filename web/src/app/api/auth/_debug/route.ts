import { NextResponse } from "next/server";
import Google from "next-auth/providers/google";

export const runtime = "nodejs";

export async function GET() {
  const info = {
    nextAuthVersion: (() => {
      try {
        return require("next-auth/package.json").version;
      } catch {
        return "unknown";
      }
    })(),
    googleTypeof: typeof Google,
    googleName: (Google as any)?.name ?? null,
    resolved: (() => {
      try {
        return require.resolve("next-auth/providers/google");
      } catch {
        return "unresolved";
      }
    })(),
  };
  return NextResponse.json(info);
}
