"use client";
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <main className="p-6">
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Sign in with Google
      </button>
    </main>
  );
}
