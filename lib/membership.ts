import { activeSubscription, stripe } from './stripe';
import { ensureUser, type User } from './users';
import { storeReady } from './store';

/** After checkout: make sure the payer has an account with the membership on it. */
export async function linkMembership(email: string | null | undefined, customer: string, paidUntil: number): Promise<User | null> {
  if (!storeReady() || !email) return null;
  try { return await ensureUser(email, { customer, paidUntil }); } catch (err) { console.error('[membership] link failed', err); return null; }
}

/** On sign-in: if this email has a live Stripe subscription, record it on the account. */
export async function refreshMembership(u: User): Promise<User> {
  if (!process.env.STRIPE_SECRET_KEY) return u;
  try {
    const ids = u.customer ? [u.customer] : (await stripe<{ data: { id: string }[] }>(`/customers?email=${encodeURIComponent(u.email)}&limit=5`)).data.map(c => c.id);
    for (const id of ids) {
      const sub = await activeSubscription(id);
      if (sub) return ensureUser(u.email, { customer: id, paidUntil: sub.current_period_end });
    }
  } catch (err) { console.error('[membership] refresh failed', err); }
  return u;
}
