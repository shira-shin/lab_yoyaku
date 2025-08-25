import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

async function doLogout(request: Request) {
  await clearAuthCookie();
  // ブラウザ遷移ならログインへ
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function GET(request: Request)  { return doLogout(request); }
export async function POST(request: Request) { return doLogout(request); }

