import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { siteUrl } from '@/lib/stripe';
import { clientIp, tooMany } from '@/lib/store';
import { PENDING, checkLoginCode, completeSignIn, pendingEmail } from '@/lib/signin';

// The 6-digit code from the sign-in email, typed on the device that asked for it.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const email = pendingEmail((await cookies()).get(PENDING)?.value);
  if (!email) return NextResponse.redirect(`${base}/login?expired=1`, 303);
  if (await tooMany(`logincode:ip:${clientIp(req)}`, 30, 900)) return NextResponse.redirect(`${base}/login?sent=1&code=slow`, 303);
  const code = String((await req.formData()).get('code') || '');
  const r = await checkLoginCode(email, code);
  if (!r.ok) return NextResponse.redirect(`${base}/login?sent=1&code=${r.why}${r.left ? `&left=${r.left}` : ''}`, 303);
  return completeSignIn(base, email, { next: r.p.next, news: r.p.news, name: r.p.name });
}
