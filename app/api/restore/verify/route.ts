import { NextResponse } from 'next/server';
import { accessCookie, verify } from '@/lib/access';
import { activeSubscription, siteUrl } from '@/lib/stripe';

export async function GET(req: Request) {
  const base = siteUrl(req);
  const tok = verify(new URL(req.url).searchParams.get('token') ?? undefined, 'restore');
  if (!tok) return NextResponse.redirect(`${base}/restore?expired=1`, 303);
  const sub = await activeSubscription(tok.c);
  if (!sub) return NextResponse.redirect(`${base}/#pricing`, 303);
  const res = NextResponse.redirect(`${base}/guide?restored=1`, 303);
  const c = accessCookie(tok.c, sub.current_period_end);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
