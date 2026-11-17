import { NextResponse } from 'next/server';
import { getAccess } from '@/lib/access';
import { siteUrl, stripe } from '@/lib/stripe';

// Stripe's hosted page for updating card details, invoices and cancelling.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const { customer } = await getAccess();
  if (!customer) return NextResponse.redirect(`${base}/restore`, 303);
  // Demo members (lib/demo.ts) have a made-up customer that Stripe doesn't know.
  if (customer.startsWith('demo_')) return NextResponse.redirect(`${base}/account?demoBilling=1`, 303);
  const portal = await stripe<{ url: string }>('/billing_portal/sessions', {
    method: 'POST',
    body: { customer, return_url: `${base}/guide` },
  });
  return NextResponse.redirect(portal.url, 303);
}
