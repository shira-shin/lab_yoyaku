import pkgNA from "next-auth/package.json";
import pkgCore from "@auth/core/package.json";
import Google from "next-auth/providers/google";

export async function GET() {
  // Providerの実体が関数か、クラスっぽいかを簡易判定
  const shape = {
    typeofGoogle: typeof Google,               // "function" なら v5 形
    isCallable: typeof Google === "function",
    keys: Object.keys(Google ?? {})            // 参考
  };

  return new Response(
    JSON.stringify({
      nextAuthVersion: pkgNA.version,
      authCoreVersion: pkgCore.version,
      googleShape: shape,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
        AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
        AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
        AUTH_SECRET: !!process.env.AUTH_SECRET,
      }
    }, null, 2),
    { headers: { "content-type": "application/json" } }
  );
}