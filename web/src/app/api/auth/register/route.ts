import { NextResponse } from 'next/server';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { isEmail, loadUsers, saveUser, uid } from '@/lib/mockdb';

export async function POST(req: Request) {
  const { email, password, name } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ ok:false, error:'email and password required' }, { status:400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok:false, error:'invalid email' }, { status:400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ ok:false, error:'password too short' }, { status:400 });
  }
  let user;
  try {
    const users = await loadUsers();
    if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
      return NextResponse.json({ ok:false, error:'email already registered' }, { status:409 });
    }

    user = {
      id: uid(),
      email: String(email),
      name: name ? String(name) : String(email).split('@')[0],
      passHash: hashPassword(String(password)),
    };
    await saveUser(user);
  } catch (err) {
    console.error('Failed to register user:', err);
    return NextResponse.json({ ok:false, error:'failed to register user' }, { status:500 });
  }

  try {
    // 自動ログイン
    const token = await signToken({ id: user.id, name: user.name || '', email: user.email });
    await setAuthCookie(token);
    return NextResponse.json({ ok:true });
  } catch (err) {
    console.error('Failed to log in user after registration:', err);
    return NextResponse.json({ ok:false, error:'failed to log in after registration' }, { status:500 });
  }
}
