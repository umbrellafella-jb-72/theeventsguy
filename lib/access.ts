import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const COOKIE = 'eg_access';

type Token = { c: string; e: number; t: 'access' | 'restore' };

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

export type Access = { paid: boolean; open: boolean; customer: string | null; paymentsReady: boolean };

export async function getAccess(): Promise<Access> {
  const paymentsReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID && process.env.ACCESS_SECRET);
  if (process.env.ACCESS_MODE === 'open') return { paid: true, open: true, customer: null, paymentsReady };
  const jar = await cookies();
  const tok = verify(jar.get(COOKIE)?.value, 'access');
  return { paid: Boolean(tok), open: false, customer: tok?.c ?? null, paymentsReady };
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
