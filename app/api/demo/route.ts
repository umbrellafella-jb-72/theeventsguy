import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/access';
import { PERSONAS, demoEnabled, personaEmail, removeDemo, seedDemo } from '@/lib/demo';
import { SESSION, sessionCookie, userByEmail } from '@/lib/users';
import { siteUrl } from '@/lib/stripe';
import { clientIp, tooMany } from '@/lib/store';

export const maxDuration = 60;

// Signs in as a demo persona (see lib/demo.ts). 404 unless demo mode is on and the site is gated.
export async function POST(req: Request) {
  if (!demoEnabled()) return new NextResponse('Not found', { status: 404 });
  const base = siteUrl(req);
  if (await tooMany(`demo:${clientIp(req)}`, 60, 600)) return new NextResponse('Too many requests', { status: 429 });
  const as = String((await req.formData()).get('as') ?? '');

  if (as === 'reset') { await seedDemo(); return NextResponse.redirect(`${base}/demo?done=reset`, 303); }
  if (as === 'remove') {
    await removeDemo();
    const res = NextResponse.redirect(`${base}/demo?done=removed`, 303);
    res.cookies.delete(SESSION); res.cookies.delete(COOKIE); return res;
  }
  if (as === 'visitor') {
    const res = NextResponse.redirect(`${base}/demo?done=out`, 303);
    res.cookies.delete(SESSION); res.cookies.delete(COOKIE); return res;
  }
  const p = PERSONAS.find(x => x.key === as);
  if (!p) return NextResponse.redirect(`${base}/demo`, 303);
  let u = await userByEmail(personaEmail(p.key));
  if (!u) { await seedDemo(); u = await userByEmail(personaEmail(p.key)); }
  if (!u) return NextResponse.redirect(`${base}/demo`, 303);
  const res = NextResponse.redirect(`${base}${p.start}`, 303);
  const s = sessionCookie(u.id); res.cookies.set(s.name, s.value, s.options);
  res.cookies.delete(COOKIE); // drop any real membership cookie so the persona's own access applies
  return res;
}
