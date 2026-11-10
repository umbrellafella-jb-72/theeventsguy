import { NextResponse } from 'next/server';
import { accessCookie, verify } from '@/lib/access';
import { ensureUser, isMember, sessionCookie } from '@/lib/users';
import { refreshMembership } from '@/lib/membership';
import { siteUrl } from '@/lib/stripe';

export async function GET(req: Request) {
  const base = siteUrl(req);
  const u0 = new URL(req.url);
  const tok = verify(u0.searchParams.get('token') ?? undefined, 'login');
  if (!tok) return NextResponse.redirect(`${base}/login?expired=1`, 303);
  let u = await ensureUser(tok.c, { lastLogin: new Date().toISOString() });
  if (u.status !== 'active') return NextResponse.redirect(`${base}/login?suspended=1`, 303);
  u = await refreshMembership(u);
  const next = (u0.searchParams.get('next') || '/account').startsWith('/') ? u0.searchParams.get('next') || '/account' : '/account';
  const res = NextResponse.redirect(`${base}${next}`, 303);
  const s = sessionCookie(u.id); res.cookies.set(s.name, s.value, s.options);
  if (isMember(u) && u.customer) { const c = accessCookie(u.customer, u.paidUntil); res.cookies.set(c.name, c.value, c.options); }
  return res;
}
