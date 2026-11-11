import { NextResponse } from 'next/server';
import { siteUrl, stripe } from '@/lib/stripe';
import { sessionUser } from '@/lib/users';
import { planFor } from '@/lib/plans';

// Starts a Stripe Checkout subscription for the chosen plan (quarterly or yearly) and sends the
// visitor to it. Only the plans configured in lib/plans.ts can be bought: the price id never
// comes from the browser.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const plan = planFor(String((await req.formData().catch(() => null))?.get('plan') ?? ''));
  if (!plan) return NextResponse.redirect(`${base}/#pricing`, 303);
  // Signed in? Tie the subscription to that account (same Stripe customer, same email).
  const u = await sessionUser();
  const session = await stripe<{ url: string }>('/checkout/sessions', {
    method: 'POST',
    body: {
      mode: 'subscription',
      'line_items[0][price]': plan.priceId,
      'metadata[plan]': plan.key,
      'subscription_data[metadata][plan]': plan.key,
      'line_items[0][quantity]': '1',
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      success_url: `${base}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#pricing`,
      ...(u?.customer ? { customer: u.customer } : u ? { customer_email: u.email } : {}),
    },
  });
  return NextResponse.redirect(session.url, 303);
}
