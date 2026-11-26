// Finishing a sign-in, from either the emailed link (on any device) or the 6-digit code typed on
// the device that asked for it. Both are single use and last 30 minutes.
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { COOKIE, accessCookie, sign, verify } from './access';
import { ensureUser, isMember, saveUser, sessionCookie, userQuarter } from './users';
import { refreshMembership } from './membership';
import { setMarketing } from './marketing';
import { claimOnce, del, getJSON, redis, safePath } from './store';

export const PENDING = 'eg_pending';
const TTL = 30 * 60, MAX_TRIES = 5;
type Pending = { h: string; tries: number; next: string; news: boolean; name: string | null; link?: string };
const K = (email: string) => `logincode:${email}`;
const hash = (email: string, code: string) => createHash('sha256').update(`${process.env.ACCESS_SECRET}:${email}:${code}`).digest('hex');

/** A new 6-digit code for this address (replacing any earlier one). */
export async function newLoginCode(email: string, o: { next: string; news: boolean; name: string | null; link?: string }): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await redis('SET', K(email), JSON.stringify({ h: hash(email, code), tries: 0, ...o } satisfies Pending), 'EX', TTL);
  return code;
}
/** Extra details from the sign-in form (name, roundup tick) for whichever way they finish. */
export async function pendingFor(email: string) { return getJSON<Pending>(K(email)).catch(() => null); }

export type CodeResult = { ok: true; p: Pending } | { ok: false; why: 'expired' | 'bad' | 'locked'; left?: number };
export async function checkLoginCode(email: string, code: string): Promise<CodeResult> {
  const p = await pendingFor(email);
  if (!p) return { ok: false, why: 'expired' };
  if (p.tries >= MAX_TRIES) return { ok: false, why: 'locked' };
  const a = Buffer.from(hash(email, code.replace(/\D/g, ''))), b = Buffer.from(p.h);
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await del(K(email));
    if (p.link) await claimOnce(`login-used:${p.link}`, 3600); // the emailed button can't be used after the code
    return { ok: true, p };
  }
  const tries = p.tries + 1;
  await redis('SET', K(email), JSON.stringify({ ...p, tries }), 'KEEPTTL');
  return tries >= MAX_TRIES ? { ok: false, why: 'locked' } : { ok: false, why: 'bad', left: MAX_TRIES - tries };
}

export const pendingCookie = (email: string) => ({ name: PENDING, value: sign({ c: email, e: Math.floor(Date.now() / 1000) + TTL, t: 'pending' }), options: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: TTL } });
export const pendingEmail = (raw: string | undefined) => verify(raw, 'pending')?.c ?? null;

/** Sign the person in and send them on. */
export async function completeSignIn(base: string, email: string, o: { next?: string | null; news?: boolean; name?: string | null }) {
  let u = await ensureUser(email, { lastLogin: new Date().toISOString() });
  if (u.status !== 'active') return NextResponse.redirect(`${base}/login?suspended=1`, 303);
  if (o.name && !u.name) u = await saveUser({ ...u, name: o.name });
  u = await refreshMembership(u);
  if (o.news) await setMarketing(u.email, true, 'Sign-in form (confirmed by email)').catch(() => null);
  await del(K(email)).catch(() => null); // the code can't be used after the link, or the other way round
  const res = NextResponse.redirect(`${base}${safePath(o.next)}`, 303);
  const s = sessionCookie(u.id); res.cookies.set(s.name, s.value, s.options);
  // The device's membership pass always matches the account signing in: a pass left on this browser
  // by someone else's membership (or an earlier test checkout) is removed for a free account.
  if (isMember(u) && u.customer) { const c = accessCookie(u.customer, u.paidUntil, userQuarter(u)); res.cookies.set(c.name, c.value, c.options); }
  else res.cookies.delete(COOKIE);
  res.cookies.delete(PENDING);
  return res;
}
