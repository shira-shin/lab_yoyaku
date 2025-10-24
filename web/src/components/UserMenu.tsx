"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type UserMenuProps = {
  onNavigate?: () => void;
  userLabel?: string | null;
};

export function UserMenu({ onNavigate, userLabel }: UserMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleNavigate = () => {
    onNavigate?.();
  };

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data?.error ?? "サインアウトに失敗しました");
        return;
      }
      onNavigate?.();
      router.push("/signin");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [onNavigate, router, signingOut]);

  return (
    <div className="min-w-48">
      {userLabel ? (
        <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
          {userLabel}
        </div>
      ) : null}
      <Link
        href="/profile"
        className="block px-4 py-2 hover:bg-gray-50"
        onClick={handleNavigate}
      >
        プロフィール
      </Link>
      <Link
        href="/groups"
        className="block px-4 py-2 hover:bg-gray-50"
        onClick={handleNavigate}
      >
        所属グループ
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-sm disabled:opacity-60"
        disabled={signingOut}
      >
        {signingOut ? "サインアウト中..." : "ログアウト"}
      </button>
      <Link
        href="/signout"
        className="block px-4 py-2 text-xs text-gray-500 hover:bg-gray-50"
        onClick={handleNavigate}
      >
        サインアウトできないときはこちら
      </Link>
    </div>
  );
}
