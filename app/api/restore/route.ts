import { NextResponse } from 'next/server';
import { sign } from '@/lib/access';
import { activeSubscription, siteUrl, stripe } from '@/lib/stripe';

// "Sign in on this device": if the email belongs to a live subscriber, email them a
// 30-minute link. The reply is the same either way so emails can't be probed.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const email = String((await req.formData()).get('email') || '').trim().toLowerCase();
  const done = NextResponse.redirect(`${base}/restore?sent=1`, 303);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !process.env.STRIPE_SECRET_KEY) return done;

  const customers = await stripe<{ data: { id: string }[] }>(`/customers?email=${encodeURIComponent(email)}&limit=5`);
  let customer: string | null = null;
  for (const c of customers.data) if (await activeSubscription(c.id)) { customer = c.id; break; }
  if (!customer) return done;

  const token = sign({ c: customer, e: Math.floor(Date.now() / 1000) + 30 * 60, t: 'restore' });
  const link = `${base}/api/restore/verify?token=${encodeURIComponent(token)}`;

  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Your EventGuy sign-in link',
        text: `Here's your link to open EventGuy on this device. It works for 30 minutes.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
      }),
    });
  } else {
    console.log(`[restore] RESEND_API_KEY not set — sign-in link for ${email}: ${link}`);
  }
  return done;
}
