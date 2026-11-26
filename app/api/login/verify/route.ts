import { NextResponse } from 'next/server';
import { accessCookie, verify } from '@/lib/access';
import { ensureUser, isMember, sessionCookie, userQuarter } from '@/lib/users';
import { refreshMembership } from '@/lib/membership';
import { siteUrl } from '@/lib/stripe';
import { claimOnce, safePath } from '@/lib/store';
import { setMarketing } from '@/lib/marketing';

// Opening the emailed link (GET) only shows a "Sign in" button (app/login/confirm): email security
// scanners open links too, and would otherwise use up the one-time link. The button (POST) signs in.
export async function GET(req: Request) {
  const u0 = new URL(req.url);
  const q = new URLSearchParams();
  for (const k of ['token', 'next', 'news']) { const v = u0.searchParams.get(k); if (v) q.set(k, v); }
  return NextResponse.redirect(`${siteUrl(req)}/login/confirm?${q}`, 303);
}

export async function POST(req: Request) {
  const base = siteUrl(req);
  const f = await req.formData();
  const u0 = new URL(`${base}/x`);
  for (const k of ['token', 'next', 'news']) { const v = f.get(k); if (typeof v === 'string' && v) u0.searchParams.set(k, v); }
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
  if (isMember(u) && u.customer) { const c = accessCookie(u.customer, u.paidUntil, userQuarter(u)); res.cookies.set(c.name, c.value, c.options); }
  return res;
}
