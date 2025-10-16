import { NextResponse } from "next/server";


export async function GET() {
  let nextAuthVersion = "unknown";
  try {
    const pkg = await import("next-auth/package.json");
    nextAuthVersion = (pkg as { version?: string })?.version ?? "unknown";
  } catch {
    nextAuthVersion = "unknown";
  }

  const maybeResolve = (import.meta as { resolve?: (specifier: string) => string }).resolve;
  let resolved = "unresolved";
  if (typeof maybeResolve === "function") {
    try {
      resolved = maybeResolve("next-auth/providers/google");
    } catch {
      resolved = "unresolved";
    }
  } else {
    resolved = "unsupported";
  }

  return NextResponse.json({
    nextAuthVersion,
    googleTypeof: "not-checked",
    googleName: null,
    resolved,
  });
}
