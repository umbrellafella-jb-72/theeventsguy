import { createHmac, timingSafeEqual } from 'node:crypto';
import { siteUrl } from '@/lib/stripe';
import { claimOnce, storeReady } from '@/lib/store';
import { MAILS, emailForCustomer, endMembership, mail, money, startMembership, userForCustomer } from '@/lib/lifecycle';

// Stripe → The Events Guy. Set up in Stripe: Developers → Webhooks → Add endpoint
//   URL:    https://<your-site>/api/stripe/webhook
//   Events: checkout.session.completed, invoice.paid, invoice.payment_failed, invoice.upcoming,
//           customer.subscription.updated, customer.subscription.deleted, charge.refunded
// then put its signing secret in STRIPE_WEBHOOK_SECRET. Every event is checked against that
// signature and handled once, however many times Stripe retries it.

function verified(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map(p => p.split('=') as [string, string]).filter(p => p.length === 2).map(([k, v]) => [k, v]));
  const all = header.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300 || !all.length) return false;
  const want = Buffer.from(createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex'));
  return all.some(sig => { const got = Buffer.from(sig); return got.length === want.length && timingSafeEqual(got, want); });
}

type Obj = Record<string, any>;
const planOf = (o: Obj | undefined | null): string | null => {
  const p = o?.metadata?.plan ?? o?.subscription_details?.metadata?.plan ?? o?.lines?.data?.[0]?.metadata?.plan;
  if (p === 'yearly' || p === 'quarterly') return p;
  const interval = o?.items?.data?.[0]?.price?.recurring ?? o?.lines?.data?.[0]?.price?.recurring;
  if (!interval) return null;
  return interval.interval === 'year' ? 'yearly' : interval.interval === 'month' && interval.interval_count === 3 ? 'quarterly' : null;
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook not configured', { status: 503 });
  const raw = await req.text();
  if (!verified(raw, req.headers.get('stripe-signature'), secret)) return new Response('Bad signature', { status: 400 });
  const evt = JSON.parse(raw) as { id: string; type: string; data: { object: Obj } };
  if (storeReady() && !(await claimOnce(`stripe-evt:${evt.id}`, 30 * 86400))) return Response.json({ received: true, duplicate: true });

  const base = siteUrl(req);
  const o = evt.data.object;
  try {
    switch (evt.type) {
      case 'checkout.session.completed': {
        if (o.mode !== 'subscription' || o.status !== 'complete') break;
        const email = (o.customer_details?.email ?? o.customer_email ?? null)?.toLowerCase() ?? null;
        const until = Math.floor(Date.now() / 1000) + (planOf(o) === 'yearly' ? 365 : 92) * 86400;
        // Membership goes on an existing account with this email; it never signs anyone in.
        await startMembership(o.customer, await userForCustomer(o.customer, email), until);
        // One welcome email per checkout, whether this or the checkout return page gets there first.
        if (email && (!storeReady() || await claimOnce(`welcome:${o.id}`, 90 * 86400))) await mail(email, 'Welcome to The Events Guy', MAILS.welcome(base, email, planOf(o), until));
        break;
      }
      case 'invoice.paid': {
        const until = o.lines?.data?.[0]?.period?.end;
        if (o.customer && until) await startMembership(o.customer, await userForCustomer(o.customer, o.customer_email ?? null), until);
        break;
      }
      case 'invoice.payment_failed':
        await mail(await emailForCustomer(o.customer, o.customer_email), 'Your payment didn’t go through', MAILS.paymentFailed(base, money(o.amount_due, o.currency)));
        break;
      case 'invoice.upcoming':
        // Stripe sends this before each renewal (set how many days before in Billing → Subscriptions → Upcoming renewal events).
        if (o.amount_due > 0) await mail(await emailForCustomer(o.customer, o.customer_email), 'Your membership renews soon', MAILS.renewing(base, money(o.amount_due, o.currency), o.next_payment_attempt ?? o.period_end));
        break;
      case 'customer.subscription.updated': {
        const before = (evt.data as Obj).previous_attributes ?? {};
        if (o.cancel_at_period_end && before.cancel_at_period_end === false)
          await mail(await emailForCustomer(o.customer), 'Your membership is set to end', MAILS.cancelling(base, o.current_period_end));
        break;
      }
      case 'customer.subscription.deleted': {
        const email = await emailForCustomer(o.customer);
        await endMembership(o.customer, await userForCustomer(o.customer, email));
        await mail(email, 'Your membership has ended', MAILS.ended(base));
        break;
      }
      case 'charge.refunded': {
        const email = await emailForCustomer(o.customer, o.billing_details?.email ?? o.receipt_email);
        // A full refund ends access straight away; a partial one is a goodwill credit and doesn't.
        if (o.refunded && o.customer) await endMembership(o.customer, await userForCustomer(o.customer, email));
        await mail(email, 'Your refund is on its way', MAILS.refunded(base, money(o.amount_refunded, o.currency)));
        break;
      }
    }
  } catch (err) {
    console.error(`[stripe] ${evt.type} failed`, err);
    return new Response('Handler error', { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}
