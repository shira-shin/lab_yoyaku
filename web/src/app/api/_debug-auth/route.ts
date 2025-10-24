import Google from "next-auth/providers/google";
import pkg from "next-auth/package.json";

export const runtime = "nodejs";
export async function GET() {
  return new Response(
    JSON.stringify(
      {
        typeofGoogle: typeof Google,
        nextAuthVersion: pkg.version,
        node: process.version,
      },
      null,
      2
    ),
    { headers: { "content-type": "application/json" } }
  );
}
