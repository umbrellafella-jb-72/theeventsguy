import { NextResponse } from 'next/server';
import { accessCookie } from '@/lib/access';
import { siteUrl, stripe, type Sub } from '@/lib/stripe';
import { linkMembership } from '@/lib/membership';
import { sessionCookie } from '@/lib/users';

// Stripe sends the buyer here after payment. We check the session with Stripe
// (never trusting the URL alone) and give this browser a signed access cookie.
export async function GET(req: Request) {
  const base = siteUrl(req);
  const id = new URL(req.url).searchParams.get('session_id');
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return NextResponse.redirect(`${base}/#pricing`, 303);
  const s = await stripe<{ status: string; customer: string; subscription: Sub | null; customer_details?: { email?: string | null } }>(
    `/checkout/sessions/${id}?expand[]=subscription`,
  );
  const ok = s.status === 'complete' && s.subscription && ['active', 'trialing'].includes(s.subscription.status);
  if (!ok) return NextResponse.redirect(`${base}/#pricing`, 303);
  const u = await linkMembership(s.customer_details?.email, s.customer, s.subscription!.current_period_end);
  const res = NextResponse.redirect(`${base}/guide?welcome=1`, 303);
  const c = accessCookie(s.customer, s.subscription!.current_period_end);
  res.cookies.set(c.name, c.value, c.options);
  if (u) { const sc = sessionCookie(u.id); res.cookies.set(sc.name, sc.value, sc.options); }
  return res;
}
