import { readUserFromCookie } from '@/lib/auth';
import NavLinks from './NavLinks';

export default async function Header() {
  const me = await readUserFromCookie();
  return (
    <header className="bg-indigo-600 text-white shadow">
      <div className="mx-auto max-w-7xl px-4 h-12 flex items-center justify-between">
        <a href="/" className="font-semibold tracking-tight">Lab Yoyaku</a>
        <NavLinks me={me} />
      </div>
    </header>
  );
}

