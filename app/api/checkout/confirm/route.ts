import { NextResponse } from 'next/server';
import { accessCookie } from '@/lib/access';
import { siteUrl, stripe, type Sub } from '@/lib/stripe';
import { linkMembership } from '@/lib/membership';
import { normEmail, sessionUser } from '@/lib/users';
import { claimOnce, del, storeReady } from '@/lib/store';
import { MAILS, endedKey, mail, startMembership } from '@/lib/lifecycle';

type Session = { status: string; customer: string; subscription: Sub | null; customer_details?: { email?: string | null } };

// Stripe sends the buyer here after payment. We check the session with Stripe (never trusting
// the URL alone) and give this browser a signed access cookie for the membership it paid for.
//
// Security: the email typed into Stripe Checkout isn't verified, so paying must never sign
// anyone in to an account. If the buyer is already signed in as that email, the membership goes
// on their account. Otherwise we email a sign-in link to that address; whoever owns the inbox
// signs in and the membership is attached then (refreshMembership looks it up in Stripe).
export async function GET(req: Request) {
  const base = siteUrl(req);
  const id = new URL(req.url).searchParams.get('session_id');
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return NextResponse.redirect(`${base}/#pricing`, 303);
  let s: Session;
  try { s = await stripe<Session>(`/checkout/sessions/${id}?expand[]=subscription`); }
  catch (err) { console.error('[checkout] confirm failed', err); return NextResponse.redirect(`${base}/#pricing`, 303); }
  const ok = s.status === 'complete' && s.subscription && ['active', 'trialing'].includes(s.subscription.status);
  if (!ok) return NextResponse.redirect(`${base}/#pricing`, 303);
  // A checkout link works once, so a shared or leaked return URL can't hand out more memberships.
  if (storeReady() && !(await claimOnce(`checkout-used:${id}`, 90 * 86400))) return NextResponse.redirect(`${base}/login?next=/welcome`, 303);

  const email = s.customer_details?.email ? normEmail(s.customer_details.email) : null;
  const me = await sessionUser();
  const until = s.subscription!.current_period_end;
  // Signed in as the buyer: the membership goes on their account now. Otherwise the welcome email's
  // sign-in link proves they own the address, and sign-in picks the membership up from Stripe.
  if (email && me && me.email === email) await startMembership(s.customer, await linkMembership(email, s.customer, until), until);
  else if (storeReady()) await del(endedKey(s.customer));
  // One welcome email per checkout, shared with the Stripe webhook (whichever runs first sends it).
  if (email && storeReady() && await claimOnce(`welcome:${id}`, 90 * 86400)) await mail(email, 'Welcome to The Events Guy', MAILS.welcome(base, email, null, until));
  const res = NextResponse.redirect(`${base}/welcome`, 303);
  const c = accessCookie(s.customer, s.subscription!.current_period_end);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
