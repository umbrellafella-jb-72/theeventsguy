import { NextResponse } from 'next/server';
import { siteUrl, stripe } from '@/lib/stripe';
import { sessionUser } from '@/lib/users';

// Starts a Stripe Checkout subscription and sends the visitor to it.
export async function POST(req: Request) {
  const base = siteUrl(req);
  if (!process.env.STRIPE_PRICE_ID) return NextResponse.redirect(`${base}/#pricing`, 303);
  // Signed in? Tie the subscription to that account (same Stripe customer, same email).
  const u = await sessionUser();
  const session = await stripe<{ url: string }>('/checkout/sessions', {
    method: 'POST',
    body: {
      mode: 'subscription',
      'line_items[0][price]': process.env.STRIPE_PRICE_ID,
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
