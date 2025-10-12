"use client";

import { useSearchParams } from "next/navigation";

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
  const signInUrl = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(redirectTo)}`;

  return (
    <a
      href={signInUrl}
      className="block w-full px-3 py-2 rounded border border-gray-300 text-center hover:bg-gray-50"
    >
      {label}
    </a>
  );
}
