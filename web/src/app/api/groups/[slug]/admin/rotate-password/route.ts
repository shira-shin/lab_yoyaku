import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getServerSession, normalizeEmail } from '@/lib/auth-legacy';

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function generatePasscode(length = 12) {
  const candidate = randomBytes(32).toString('base64url');
  return candidate.slice(0, length);
}

export async function POST(_: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  }

  const slug = decodeSlug(params.slug ?? '').toLowerCase();
  const group = await prisma.group.findUnique({ where: { slug } });
  if (!group) {
    return NextResponse.json({ code: 'group_not_found' }, { status: 404 });
  }

  if (normalizeEmail(group.hostEmail ?? '') !== normalizeEmail(email)) {
    return NextResponse.json({ code: 'forbidden' }, { status: 403 });
  }

  const plain = generatePasscode();
  const roundsRaw = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const rounds = Number.isNaN(roundsRaw) ? 10 : roundsRaw;
  const hash = await bcrypt.hash(plain, rounds);
  await prisma.group.update({ where: { id: group.id }, data: { passcode: hash } });

  return NextResponse.json(
    { password: plain },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
