"use client";

import { signInWithGoogle } from "@/server/actions/auth";

type GoogleSignButtonsProps = {
  callbackUrl?: string;
  label?: string;
};

export function GoogleSignButtons({
  callbackUrl = "/dashboard",
  label = "Googleで続ける",
}: GoogleSignButtonsProps) {
  return (
    <form action={signInWithGoogle} className="w-full">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <button
        type="submit"
        className="w-full px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
      >
        {label}
      </button>
    </form>
  );
}
