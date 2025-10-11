"use client";

import { signIn } from "next-auth/react";

type GoogleSignButtonsProps = {
  callbackUrl?: string;
  label?: string;
};

export function GoogleSignButtons({
  callbackUrl = "/dashboard",
  label = "Googleで続ける",
}: GoogleSignButtonsProps) {
  const handleClick = () => {
    void signIn("google", { callbackUrl });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
    >
      {label}
    </button>
  );
}
