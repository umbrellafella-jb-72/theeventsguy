import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/stripe';
import { clientIp, tooMany } from '@/lib/store';

// Services and Sponsors enquiries. Emailed through Resend when configured, else logged.
export async function POST(req: Request) {
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || '').trim().slice(0, 4000);
  const from = get('from') === 'sponsors' ? 'sponsors' : 'services';
  // kind=host is the "List your event" form: it needs an event link, and the message is optional.
  const host = get('kind') === 'host';
  const anchor = host ? 'host-form' : 'enquire';
  const back = NextResponse.redirect(`${siteUrl(req)}/${from}?${host ? 'listed' : 'sent'}=1#${anchor}`, 303);
  // Bots fill the hidden field; they get the normal thank-you but nothing is sent.
  // People are limited to 5 enquiries an hour per IP address.
  if (get('company_url') || await tooMany(`enquire:${clientIp(req)}`, 5, 3600)) return back;
  const email = get('email');
  const ok = get('name') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (host ? /^https?:\/\/\S+\.\S+/.test(get('link')) && get('event') : get('message'));
  if (!ok) return NextResponse.redirect(`${siteUrl(req)}/${from}#${anchor}`, 303);
  const fields = host ? ['name', 'email', 'event', 'link', 'interest', 'message'] : ['name', 'email', 'company', 'interest', 'message'];
  const text = fields.map(k => `${k}: ${get(k)}`).join('\n');
  const to = process.env.ENQUIRIES_TO || 'hello@theeventsguy.co.uk';
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, reply_to: email, subject: host ? `Event listing (${get('interest')}): ${get('event')}` : `New ${from} enquiry: ${get('interest')}`, text }),
    });
  } else {
    console.log(`[enquiry → ${to}]\n${text}`);
  }
  return back;
}
