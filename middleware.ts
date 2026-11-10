import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, accessCookie, verify } from '@/lib/access';
import { activeSubscription } from '@/lib/stripe';

// Keeps subscribers signed in across renewals. The access cookie runs to the end of the paid
// period plus 3 days' grace. From a day before renewal, we ask Stripe (at most once an hour per
// browser) whether the subscription has rolled on, and if so extend the cookie to the new period.
// Cancelled subscriptions simply aren't extended, so access ends when the paid period does.
const CHECKED = 'eg_renew_checked';

// Pre-launch gate: when SITE_USERNAME and SITE_PASSWORD are set (in Vercel → Settings →
// Environment Variables), every page asks for them with the browser's login box. Remove both to
// open the site. Vercel's scheduled jobs (/api/cron) still get through; browsers remember the
// login, so Stripe checkout returns and emailed sign-in links work as normal.
const OPEN_PATHS = [/^\/api\/cron\//, /^\/favicon/, /^\/robots\.txt$/];
function sameText(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
function gate(req: NextRequest): NextResponse | null {
  const user = process.env.SITE_USERNAME, pass = process.env.SITE_PASSWORD;
  if (!user || !pass || OPEN_PATHS.some(re => re.test(req.nextUrl.pathname))) return null;
  const h = req.headers.get('authorization') || '';
  if (h.startsWith('Basic ')) {
    try {
      const [u, ...rest] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
      if (sameText(u, user) && sameText(rest.join(':'), pass)) return null;
    } catch { /* fall through */ }
  }
  return new NextResponse('This site is in preview. Please sign in.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="The Events Guy preview", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

export async function middleware(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
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
  // Everything except Next's own build files, so the gate covers pages, images and APIs.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
