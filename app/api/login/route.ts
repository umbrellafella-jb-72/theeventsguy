import { NextResponse } from 'next/server';
import { loginToken, normEmail, validEmail } from '@/lib/users';
import { storeReady } from '@/lib/store';
import { sendEmail } from '@/lib/email';
import { siteUrl } from '@/lib/stripe';

// One login for everyone: we email a 30-minute sign-in link. The account is created when the
// link is used, so mistyped addresses never become accounts. Same reply either way.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const f = await req.formData();
  const email = normEmail(String(f.get('email') || ''));
  const next = String(f.get('next') || '').startsWith('/') ? String(f.get('next')) : '/account';
  if (!storeReady()) return NextResponse.redirect(`${base}/login?off=1`, 303);
  if (!validEmail(email)) return NextResponse.redirect(`${base}/login?bad=1`, 303);
  const link = `${base}/api/login/verify?token=${encodeURIComponent(loginToken(email))}&next=${encodeURIComponent(next)}`;
  const sent = await sendEmail({ to: email, subject: 'Your sign-in link for The Events Guy', text: `Here's your link to sign in to The Events Guy. It works for 30 minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.` });
  if (!sent) console.log(`[login] sign-in link for ${email}: ${link}`);
  return NextResponse.redirect(`${base}/login?sent=1`, 303);
}
