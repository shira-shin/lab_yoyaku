"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

type UserMenuProps = {
  onNavigate?: () => void;
  userLabel?: string | null;
};

export function UserMenu({ onNavigate, userLabel }: UserMenuProps) {
  const handleNavigate = () => {
    onNavigate?.();
  };

  const handleSignOut = () => {
    onNavigate?.();
    void signOut({ callbackUrl: "/signin" });
  };

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
        className="w-full text-left px-4 py-2 hover:bg-gray-50"
      >
        ログアウト
      </button>
      <Link
        href="/api/auth/signout?callbackUrl=/signin"
        className="block px-4 py-2 text-xs text-gray-500 hover:bg-gray-50"
        onClick={handleNavigate}
      >
        サインアウトできないときはこちら
      </Link>
    </div>
  );
}
