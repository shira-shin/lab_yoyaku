"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type GoogleSignButtonsProps = {
  callbackUrl?: string;
  label?: string;
};

export function GoogleSignButtons({
  callbackUrl,
  label = "Googleで続ける",
}: GoogleSignButtonsProps) {
  const searchParams = useSearchParams();
  const callbackFromParams = searchParams.get("callbackUrl");
  const redirectTo = callbackUrl ?? callbackFromParams ?? "/dashboard";

  const handleClick = useCallback(() => {
    void signIn("google", { callbackUrl: redirectTo });
  }, [redirectTo]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="block w-full px-3 py-2 rounded border border-gray-300 text-center hover:bg-gray-50"
    >
      {label}
    </button>
  );
}
