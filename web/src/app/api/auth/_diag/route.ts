import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // ESM でも Node では require.resolve が使える（Next がラップ）
  // 失敗したら undefined で返す
  const r = (name: string) => {
    try {
      // @ts-ignore
      return require.resolve(name);
    } catch {
      return undefined;
    }
  };

  return NextResponse.json({
    node: process.versions.node,
    vercel: process.env.VERCEL === "1",
    nextAuthResolved: r("next-auth"),
    authCoreResolved: r("@auth/core"),
    nextAuthVersion: r("next-auth/package.json"),
    authCoreVersion: r("@auth/core/package.json"),
    authUrl: process.env.AUTH_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  });
}
