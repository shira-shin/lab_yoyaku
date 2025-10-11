"use client";

import { signIn, signOut } from "next-auth/react";

type Props = {
  callbackUrl?: string;
  showSignOut?: boolean;
};

export function AuthButtons({ callbackUrl, showSignOut = true }: Props) {
  const resolvedCallbackUrl = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : undefined;

  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          void signIn("google", { callbackUrl: resolvedCallbackUrl });
        }}
        className="px-3 py-2 rounded bg-black text-white"
      >
        Googleでサインイン
      </button>
      {showSignOut && (
        <button
          onClick={() => {
            void signOut({ callbackUrl: "/" });
          }}
          className="px-3 py-2 rounded border"
        >
          サインアウト
        </button>
      )}
    </div>
  );
}
