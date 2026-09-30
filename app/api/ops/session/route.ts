import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const COOKIE = 'analyzeit_ops';

function sign(secret: string): string {
  return createHmac('sha256', secret).update('ops-session').digest('hex');
}

export async function POST(request: Request) {
  const secret = process.env.ADMIN_OPERATOR_KEY || '';
  if (!secret) {
    return NextResponse.json({ detail: 'ADMIN_OPERATOR_KEY is not set on the frontend server' }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const given = String(body.key || '');
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ detail: 'Invalid operator key' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sign(secret), { httpOnly: true, sameSite: 'strict', path: '/', secure: process.env.NODE_ENV === 'production' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
