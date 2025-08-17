import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lab Yoyaku" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
