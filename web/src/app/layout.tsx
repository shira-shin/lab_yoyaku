export const dynamic = 'force-dynamic';
export const revalidate = 0;

import './globals.css';
import Header from '@/components/Header';
import { Toaster } from '@/lib/toast';

export const metadata = {
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}

