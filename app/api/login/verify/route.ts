import { NextResponse } from 'next/server';
import { accessCookie, verify } from '@/lib/access';
import { ensureUser, isMember, sessionCookie } from '@/lib/users';
import { refreshMembership } from '@/lib/membership';
import { siteUrl } from '@/lib/stripe';
import { claimOnce, safePath } from '@/lib/store';
import { setMarketing } from '@/lib/marketing';

export async function GET(req: Request) {
  const base = siteUrl(req);
  const u0 = new URL(req.url);
  const raw = u0.searchParams.get('token') ?? undefined;
  const tok = verify(raw, 'login');
  if (!tok) return NextResponse.redirect(`${base}/login?expired=1`, 303);
  // Each link signs in once: a forwarded or leaked link can't be reused.
  if (!(await claimOnce(`login-used:${raw!.split('.')[1]}`, 3600))) return NextResponse.redirect(`${base}/login?used=1`, 303);
  let u = await ensureUser(tok.c, { lastLogin: new Date().toISOString() });
  if (u.status !== 'active') return NextResponse.redirect(`${base}/login?suspended=1`, 303);
  u = await refreshMembership(u);
  if (u0.searchParams.get('news') === '1') await setMarketing(u.email, true, 'Sign-in form (confirmed by email)').catch(() => null);
  const res = NextResponse.redirect(`${base}${safePath(u0.searchParams.get('next'))}`, 303);
  const s = sessionCookie(u.id); res.cookies.set(s.name, s.value, s.options);
  if (isMember(u) && u.customer) { const c = accessCookie(u.customer, u.paidUntil); res.cookies.set(c.name, c.value, c.options); }
  return res;
}
