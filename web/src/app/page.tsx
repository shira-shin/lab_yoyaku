export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
