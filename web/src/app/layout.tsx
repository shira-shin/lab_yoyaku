import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Lab Yoyaku" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className="border-b">
          <div className="mx-auto max-w-[1040px] px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold">Lab Yoyaku</Link>
            <nav className="flex gap-6 text-sm text-neutral-600">
              <Link href="/dashboard" className="hover:text-neutral-900">ダッシュボード</Link>
              <Link href="/dashboard" className="hover:text-neutral-900">機器一覧</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1040px] px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
