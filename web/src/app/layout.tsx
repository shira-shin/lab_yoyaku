import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const metadata: Metadata = { title: "Lab Yoyaku" };

async function HeaderRight() {
  const token = cookies().get("auth_token")?.value;
  const authed = token ? !!(await verifyToken(token)) : false;
  return (
    <nav className="flex gap-6 text-sm text-neutral-600">
      <Link href="/dashboard" className="hover:text-neutral-900">ダッシュボード</Link>
      <Link href="/groups" className="hover:text-neutral-900">グループ</Link>
      {authed ? (
        <form action="/api/auth/logout" method="post">
          <button className="hover:text-neutral-900">ログアウト</button>
        </form>
      ) : (
        <Link href="/login" className="hover:text-neutral-900">ログイン</Link>
      )}
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className="border-b">
          <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold">Lab Yoyaku</Link>
            {/* @ts-expect-error Server Component */}
            <HeaderRight />
          </div>
        </header>
        <main className="mx-auto max-w-[1040px] px-4 sm:px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
