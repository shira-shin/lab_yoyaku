import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lab Yoyaku" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        <header className="fixed top-0 z-10 w-full border-b bg-white/80 backdrop-blur">
          <div className="app-container flex h-14 items-center justify-between">
            <a href="/" className="font-bold">
              Lab Yoyaku
            </a>
            <nav className="flex gap-4 text-sm">
              <a href="/dashboard" className="hover:underline">
                ダッシュボード
              </a>
              <a href="/dashboard" className="hover:underline">
                機器一覧
              </a>
            </nav>
          </div>
        </header>
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
