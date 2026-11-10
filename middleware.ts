import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, accessCookie, verify } from '@/lib/access';
import { activeSubscription } from '@/lib/stripe';

// Keeps subscribers signed in across renewals. The access cookie runs to the end of the paid
// period plus 3 days' grace. From a day before renewal, we ask Stripe (at most once an hour per
// browser) whether the subscription has rolled on, and if so extend the cookie to the new period.
// Cancelled subscriptions simply aren't extended, so access ends when the paid period does.
const CHECKED = 'eg_renew_checked';

export async function middleware(req: NextRequest) {
  const tok = verify(req.cookies.get(COOKIE)?.value, 'access');
  if (!tok || !process.env.STRIPE_SECRET_KEY || req.cookies.get(CHECKED)) return NextResponse.next();
  const periodEnd = tok.e - 3 * 86400;
  if (Date.now() / 1000 < periodEnd - 86400) return NextResponse.next();

  const res = NextResponse.next();
  try {
    const sub = await activeSubscription(tok.c);
    if (sub && sub.current_period_end > periodEnd) {
      const c = accessCookie(tok.c, sub.current_period_end);
      res.cookies.set(c.name, c.value, c.options);
    }
  } catch {
    // Stripe unreachable: keep the current cookie and try again next hour.
  }
  res.cookies.set(CHECKED, '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 3600 });
  return res;
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/|api/|partners/|favicon).*)'],
};
