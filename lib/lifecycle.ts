// Membership emails and access changes driven by Stripe's webhook (app/api/stripe/webhook).
import { del, getValue, setValue, storeReady } from './store';
import { getUser, loginToken, saveUser, userByEmail, type User } from './users';
import { sendEmail } from './email';
import { renderNotice, type TemplateKey } from './templates';
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
export async function startMembership(customer: string, u: User | null, paidUntil: number, plan?: 'quarterly' | 'yearly' | null, periodStart?: number | null) {
  if (!storeReady()) return;
  await del(endedKey(customer));
  if (u) {
    // A newer billing period moves a quarterly member on to the quarter that period starts in.
    const newer = periodStart && periodStart >= (u.periodStart ?? 0);
    await saveUser({ ...u, customer, paidUntil: Math.max(u.paidUntil, paidUntil), ...(plan ? { plan } : {}), ...(newer ? { periodStart } : {}) });
    await rememberCustomer(customer, u.id);
  }
}
/** End access now: the cookie check sees the marker, and the account's paid-until date is cleared. */
export async function endMembership(customer: string, u: User | null) {
  if (!storeReady()) return;
  await setValue(endedKey(customer), new Date().toISOString());
  if (u) await saveUser({ ...u, paidUntil: Math.floor(Date.now() / 1000) });
}

const day = (unix: number) => new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' });
const money = (pence: number, cur = 'gbp') => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur.toUpperCase() }).format(pence / 100);

// Membership emails: the words live in lib/templates (editable in Admin → Emails & forms); this
// only supplies the values and the button link for each one.
type Mail = { key: TemplateKey; vars: Record<string, string>; url?: string };
export const MAILS = {
  welcome: (base: string, email: string, plan: string | null, until: number): Mail => ({ key: 'welcome', url: `${base}/api/login/verify?token=${encodeURIComponent(loginToken(email))}&next=/welcome`, vars: {
    plan: plan ?? 'membership', until: day(until),
    access: plan === 'quarterly'
      ? 'Every event and award in the calendar quarter you joined is open in full now: venue, prices, booking links and speakers. Save events to your shortlist and they’ll go straight into your calendar.'
      : 'Every event in this month and the next five is open in full: venue, prices, booking links and speakers, moving on a month at a time. Save events to your shortlist and they’ll go straight into your calendar.',
  } }),
  paymentFailed: (base: string, amount: string): Mail => ({ key: 'paymentFailed', url: `${base}/account#membership`, vars: { amount } }),
  renewing: (base: string, amount: string, on: number): Mail => ({ key: 'renewing', url: `${base}/account#membership`, vars: { amount, date: day(on) } }),
  cancelling: (base: string, until: number): Mail => ({ key: 'cancelling', url: `${base}/account#membership`, vars: { until: day(until) } }),
  ended: (base: string): Mail => ({ key: 'ended', url: `${base}/#pricing`, vars: {} }),
  refunded: (base: string, amount: string): Mail => ({ key: 'refunded', url: `${base}/account`, vars: { amount } }),
};
export { day, money };

export async function mail(to: string | null, m: Mail) {
  if (!to) return false;
  const r = await renderNotice(m.key, m.vars, m.url);
  return sendEmail({ to, subject: r.subject, text: r.text, html: r.html, tag: m.key });
}
