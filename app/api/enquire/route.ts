import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/stripe';

// Services and Sponsors enquiries. Emailed through Resend when configured, else logged.
export async function POST(req: Request) {
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || '').trim().slice(0, 4000);
  const from = get('from') === 'sponsors' ? 'sponsors' : 'services';
  const back = NextResponse.redirect(`${siteUrl(req)}/${from}?sent=1#enquire`, 303);
  const email = get('email');
  if (!get('name') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !get('message')) return NextResponse.redirect(`${siteUrl(req)}/${from}#enquire`, 303);
  const text = ['name', 'email', 'company', 'interest', 'message'].map(k => `${k}: ${get(k)}`).join('\n');
  const to = process.env.ENQUIRIES_TO || 'hello@theeventsguy.co.uk';
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, reply_to: email, subject: `New ${from} enquiry: ${get('interest')}`, text }),
    });
  } else {
    console.log(`[enquiry → ${to}]\n${text}`);
  }
  return back;
}
