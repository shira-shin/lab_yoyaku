"use client";

import Link from "next/link";

type UserMenuProps = {
  onNavigate?: () => void;
  userLabel?: string | null;
};

export function UserMenu({ onNavigate, userLabel }: UserMenuProps) {
  const handleNavigate = () => {
    onNavigate?.();
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
      <a
        href="/api/auth/signout?callbackUrl=/signin"
        onClick={handleNavigate}
        className="block w-full text-left px-4 py-2 hover:bg-gray-50"
      >
        ログアウト
      </a>
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
