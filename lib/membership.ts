import { activeSubscription, stripe, subPlan } from './stripe';
import { ensureUser, saveUser, type User } from './users';
import { storeReady } from './store';

/** After checkout: make sure the payer has an account with the membership on it. */
export async function linkMembership(email: string | null | undefined, customer: string, paidUntil: number, plan?: 'quarterly' | 'yearly' | null, periodStart?: number | null): Promise<User | null> {
  if (!storeReady() || !email) return null;
  try { return await ensureUser(email, { customer, paidUntil, plan, periodStart }); } catch (err) { console.error('[membership] link failed', err); return null; }
}

/** Make the account's membership match Stripe, both ways: a live subscription for this account
 *  (by its customer, or by email) is recorded on it; if Stripe has none, the account becomes free.
 *  That also clears test-mode memberships once the live Stripe keys are in. Demo accounts are left
 *  alone. If Stripe can't be reached, nothing changes. */
export async function refreshMembership(u: User): Promise<User> {
  if (!process.env.STRIPE_SECRET_KEY || u.email.endsWith('.invalid')) return u;
  try {
    const byEmail = (await stripe<{ data: { id: string }[] }>(`/customers?email=${encodeURIComponent(u.email)}&limit=5`)).data.map(c => c.id);
    for (const id of [...new Set([...(u.customer ? [u.customer] : []), ...byEmail])]) {
      let sub = null;
      try { sub = await activeSubscription(id); }
      catch (e) { if (!/No such customer|Stripe 404/i.test(String(e))) throw e; } // e.g. a test-mode customer under live keys
      if (sub) return saveUser({ ...u, customer: id, paidUntil: sub.current_period_end, plan: subPlan(sub), periodStart: sub.current_period_start });
    }
    if (u.paidUntil || u.plan) return saveUser({ ...u, paidUntil: 0, plan: null, periodStart: null });
  } catch (err) { console.error('[membership] refresh failed', err); }
  return u;
}
