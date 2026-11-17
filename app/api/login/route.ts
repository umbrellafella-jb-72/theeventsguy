import { NextResponse } from 'next/server';
import { loginToken, normEmail, validEmail } from '@/lib/users';
import { clientIp, safePath, storeReady, tooMany } from '@/lib/store';
import { sendEmail } from '@/lib/email';
import { renderNotice } from '@/lib/templates';
import { siteUrl } from '@/lib/stripe';

// One login for everyone: we email a 30-minute, single-use sign-in link. The account is created
// when the link is used, so mistyped addresses never become accounts. Same reply either way.
// Rate limits stop the form being used to flood someone's inbox: 5 links per address and
// 20 per IP address in any 15 minutes.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const f = await req.formData();
  const email = normEmail(String(f.get('email') || ''));
  const next = safePath(String(f.get('next') || ''));
  if (!storeReady()) return NextResponse.redirect(`${base}/login?off=1`, 303);
  if (!validEmail(email)) return NextResponse.redirect(`${base}/login?bad=1`, 303);
  if (await tooMany(`login:ip:${clientIp(req)}`, 20, 900) || await tooMany(`login:email:${email}`, 5, 900))
    return NextResponse.redirect(`${base}/login?slow=1`, 303);
  // Ticking the roundup box only counts once they click the emailed link (confirmed opt-in).
  const news = f.get('marketing') === 'yes' ? '&news=1' : '';
  const link = `${base}/api/login/verify?token=${encodeURIComponent(loginToken(email))}&next=${encodeURIComponent(next)}${news}`;
  const m = await renderNotice('login', {}, link);
  const sent = await sendEmail({ to: email, subject: m.subject, text: m.text, html: m.html, tag: 'login' });
  // Only print the link when email isn't set up at all (local development), never in production.
  if (!sent && process.env.NODE_ENV !== 'production') console.log(`[login] sign-in link for ${email}: ${link}`);
  // In production, say so if it didn't go (the reason is in Admin → Emails & forms).
  if (!sent && process.env.NODE_ENV === 'production') return NextResponse.redirect(`${base}/login?failed=1&next=${encodeURIComponent(next)}`, 303);
  return NextResponse.redirect(`${base}/login?sent=1`, 303);
}
