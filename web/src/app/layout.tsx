import './globals.css';
import Header from '@/components/Header';

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-background text-gray-900 font-sans">
        <Header />
        <main className="app-container py-8">{children}</main>
      </body>
    </html>
  );
}

