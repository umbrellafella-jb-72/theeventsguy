import { NextResponse } from 'next/server';
import { accessCookie } from '@/lib/access';
import { siteUrl, stripe, type Sub } from '@/lib/stripe';

// Stripe sends the buyer here after payment. We check the session with Stripe
// (never trusting the URL alone) and give this browser a signed access cookie.
export async function GET(req: Request) {
  const base = siteUrl(req);
  const id = new URL(req.url).searchParams.get('session_id');
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return NextResponse.redirect(`${base}/#pricing`, 303);
  const s = await stripe<{ status: string; customer: string; subscription: Sub | null }>(
    `/checkout/sessions/${id}?expand[]=subscription`,
  );
  const ok = s.status === 'complete' && s.subscription && ['active', 'trialing'].includes(s.subscription.status);
  if (!ok) return NextResponse.redirect(`${base}/#pricing`, 303);
  const res = NextResponse.redirect(`${base}/guide?welcome=1`, 303);
  const c = accessCookie(s.customer, s.subscription!.current_period_end);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
