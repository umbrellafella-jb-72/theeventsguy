import { NextResponse } from 'next/server';
import { accessCookie } from '@/lib/access';
import { siteUrl, stripe, type Sub } from '@/lib/stripe';
import { linkMembership } from '@/lib/membership';
import { loginToken, normEmail, sessionUser, userByEmail } from '@/lib/users';
import { claimOnce, storeReady } from '@/lib/store';
import { sendEmail } from '@/lib/email';

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
  if (email && me && me.email === email) await linkMembership(email, s.customer, s.subscription!.current_period_end);
  else if (email && storeReady()) {
    // New buyers get their account straight away (it's created by the link, not by paying).
    const existing = await userByEmail(email);
    const link = `${base}/api/login/verify?token=${encodeURIComponent(loginToken(email))}&next=/welcome`;
    await sendEmail({
      to: email,
      subject: existing ? 'Your membership is ready — sign in to The Events Guy' : 'Welcome to The Events Guy — finish setting up your account',
      text: `Thanks for subscribing to The Events Guy.\n\nUse this link to sign in on any device. It works once, for 30 minutes:\n\n${link}\n\nAfter it expires, request a fresh link at ${base}/login with this email address.`,
    });
  }
  const res = NextResponse.redirect(`${base}/welcome`, 303);
  const c = accessCookie(s.customer, s.subscription!.current_period_end);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}
