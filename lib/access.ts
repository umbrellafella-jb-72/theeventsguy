import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'eg_access';

// access: the browser's sign-in. restore: a 30-minute sign-in link. feed: a member's private calendar
// feed URL. prefs: the one-click email opt-out link.
// session: a signed-in account (c = user id). login: a 30-minute emailed sign-in link (c = email).
export type Token = { c: string; e: number; t: 'access' | 'restore' | 'feed' | 'prefs' | 'session' | 'login' };

function secret(): string {
  const s = process.env.ACCESS_SECRET;
  if (!s || s.length < 16) throw new Error('ACCESS_SECRET is not set (needs 16+ characters).');
  return s;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function sign(payload: Token): string {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verify(token: string | undefined, type: Token['t']): Token | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  let expected: Buffer;
  try { expected = createHmac('sha256', secret()).update(body).digest(); } catch { return null; }
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Token;
    if (p.t !== type || p.e * 1000 < Date.now()) return null;
    return p;
  } catch { return null; }
}

export type Access = { paid: boolean; open: boolean; customer: string | null; paymentsReady: boolean; paidUntil: number };

export async function getAccess(): Promise<Access> {
  const paymentsReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.ACCESS_SECRET);
  if (process.env.ACCESS_MODE === 'open') return { paid: true, open: true, customer: null, paymentsReady, paidUntil: 0 };
  const jar = await cookies();
  const tok = verify(jar.get(COOKIE)?.value, 'access');
  if (tok) return { paid: true, open: false, customer: tok.c, paymentsReady, paidUntil: tok.e - 3 * 86400 };
  // Signed in on a device without the access cookie: the account's membership still counts.
  const { sessionUser } = await import('./users');
  const u = await sessionUser();
  const live = Boolean(u && u.customer && u.paidUntil + 3 * 86400 > Date.now() / 1000);
  return { paid: live, open: false, customer: live ? u!.customer : null, paymentsReady, paidUntil: live ? u!.paidUntil : 0 };
}

/** Cookie lasts until the paid period ends, plus a few days' grace for renewals. */
export function accessCookie(customer: string, periodEnd: number) {
  const e = periodEnd + 3 * 86400;
  return {
    name: COOKIE,
    value: sign({ c: customer, e, t: 'access' }),
    options: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', expires: new Date(e * 1000) },
  };
}

/** Long-lived signed links (calendar feed, email opt-out). Ten years; revoke by rotating ACCESS_SECRET. */
export const longToken = (customer: string, t: 'feed' | 'prefs') => sign({ c: customer, e: Math.floor(Date.now() / 1000) + 3650 * 86400, t });
