// Membership emails and access changes driven by Stripe's webhook (app/api/stripe/webhook).
import { del, getValue, setValue, storeReady } from './store';
import { getUser, loginToken, saveUser, userByEmail, type User } from './users';
import { noticeEmail, sendEmail } from './email';
import { stripe } from './stripe';

/** Customers whose membership ended early (cancelled now, or fully refunded): their access cookie stops working. */
export const endedKey = (customer: string) => `ended:${customer}`;
export async function membershipEnded(customer: string): Promise<boolean> {
  if (!storeReady()) return false;
  try { return Boolean(await getValue(endedKey(customer))); } catch { return false; }
}

export async function emailForCustomer(customer: string, hint?: string | null): Promise<string | null> {
  if (hint) return hint.toLowerCase();
  try { const e = (await stripe<{ email: string | null }>(`/customers/${customer}`)).email; if (e) return e.toLowerCase(); } catch { /* fall back to the account */ }
  // Fall back to the account linked to this customer.
  const id = storeReady() ? await getValue(`cust:${customer}`).catch(() => null) : null;
  const u = id ? await getUser(id) : null;
  return u?.email ?? null;
}
export async function userForCustomer(customer: string, email: string | null): Promise<User | null> {
  if (!storeReady()) return null;
  const id = await getValue(`cust:${customer}`);
  if (id) { const u = await getUser(id); if (u) return u; }
  return email ? userByEmail(email) : null;
}
export async function rememberCustomer(customer: string, userId: string) { if (storeReady()) await setValue(`cust:${customer}`, userId); }

/** Membership is live again (new or renewed): clear any early-end marker. */
export async function startMembership(customer: string, u: User | null, paidUntil: number) {
  if (!storeReady()) return;
  await del(endedKey(customer));
  if (u) { await saveUser({ ...u, customer, paidUntil: Math.max(u.paidUntil, paidUntil) }); await rememberCustomer(customer, u.id); }
}
/** End access now: the cookie check sees the marker, and the account's paid-until date is cleared. */
export async function endMembership(customer: string, u: User | null) {
  if (!storeReady()) return;
  await setValue(endedKey(customer), new Date().toISOString());
  if (u) await saveUser({ ...u, paidUntil: Math.floor(Date.now() / 1000) });
}

const day = (unix: number) => new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
const money = (pence: number, cur = 'gbp') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur.toUpperCase() }).format(pence / 100);

export const MAILS = {
  welcome: (base: string, email: string, plan: string | null, until: number) => noticeEmail({
    heading: 'Welcome to The Events Guy',
    paras: [`Thanks for joining${plan ? ` on the ${plan} plan` : ''}. Your membership runs to ${day(until)} and renews automatically.`,
      'Every event is listed 60 days ahead, with venue, prices, booking links and speakers from 30 days. Save events to your shortlist and they’ll go straight into your calendar.',
      'Use the button to sign in on any device. It works once, for 30 minutes — after that, request a fresh link with this email address.'],
    button: { label: 'Sign in and get started', url: `${base}/api/login/verify?token=${encodeURIComponent(loginToken(email))}&next=/welcome` } }),
  paymentFailed: (base: string, amount: string) => noticeEmail({
    heading: 'Your payment didn’t go through',
    paras: [`We couldn’t take your membership payment of ${amount}. Stripe will try again over the next few days.`, 'To keep your access, please check your card details. It only takes a minute.'],
    button: { label: 'Update your card', url: `${base}/account#membership` } }),
  renewing: (base: string, amount: string, on: number) => noticeEmail({
    heading: 'Your membership renews soon',
    paras: [`Your membership renews on ${day(on)} for ${amount}. You don’t need to do anything.`, 'If you’d like to change plan or cancel, you can do it from your account before then.'],
    button: { label: 'Manage membership', url: `${base}/account#membership` } }),
  cancelling: (base: string, until: number) => noticeEmail({
    heading: 'Your membership is set to end',
    paras: [`You’ve cancelled your membership. You keep full access until ${day(until)}, and you won’t be charged again.`, 'Changed your mind? You can restart it from your account any time before then.'],
    button: { label: 'Restart membership', url: `${base}/account#membership` } }),
  ended: (base: string) => noticeEmail({
    heading: 'Your membership has ended',
    paras: ['Your membership has now ended. Your account, shortlist and saved searches are still there, and you can still see what’s on over the next 60 days.', 'Rejoin any time to get full event details again.'],
    button: { label: 'See membership plans', url: `${base}/#pricing` } }),
  refunded: (base: string, amount: string) => noticeEmail({
    heading: 'Your refund is on its way',
    paras: [`We’ve refunded ${amount}. It usually reaches your account in 5–10 working days.`, 'Your membership has ended. Your free account stays open if you want to keep browsing.'],
    button: { label: 'Go to your account', url: `${base}/account` } }),
};
export { day, money };

export async function mail(to: string | null, subject: string, m: { text: string; html: string }) {
  if (to) await sendEmail({ to, subject, ...m });
}
