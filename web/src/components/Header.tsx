import { readUserFromCookie } from '@/lib/auth';
import NavLinks from './NavLinks';
import { serverFetch } from '@/lib/server-fetch';

export default async function Header() {
  const me = await readUserFromCookie();
  let displayName: string | null = null;
  if (me?.email) {
    try {
      const profileRes = await serverFetch('/api/me/profile');
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        displayName = profileJson?.displayName ?? null;
      }
    } catch {
      /* ignore */
    }
  }
  return (
    <header className="bg-indigo-600 text-white shadow">
      <div className="mx-auto max-w-7xl px-4 h-12 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight">Lab Yoyaku</a>
        <NavLinks me={me} displayName={displayName} />
      </div>
    </header>
  );
}

