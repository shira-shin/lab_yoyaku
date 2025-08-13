import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lab Yoyaku',
  description: 'Lab equipment reservation system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
