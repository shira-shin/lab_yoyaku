"use client";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function Login() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const callbackUrl = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  return (
    <main className="p-6">
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Sign in with Google
      </button>
    </main>
  );
}
