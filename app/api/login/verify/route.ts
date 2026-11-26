import { NextResponse } from 'next/server';
import { verify } from '@/lib/access';
import { completeSignIn, pendingFor } from '@/lib/signin';
import { siteUrl } from '@/lib/stripe';
import { claimOnce } from '@/lib/store';

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
  const pend = await pendingFor(tok.c);
  return completeSignIn(base, tok.c, { next: u0.searchParams.get('next'), news: u0.searchParams.get('news') === '1', name: pend?.name ?? null });
}
