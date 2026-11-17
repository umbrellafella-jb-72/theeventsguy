// Minimal Stripe REST client (no SDK). API version pinned so `current_period_end`
// stays on the subscription object.
const API = 'https://api.stripe.com/v1';
const VERSION = '2024-06-20';

function key() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error('STRIPE_SECRET_KEY is not set.');
  return k;
}

function form(obj: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) p.append(k, v);
  return p;
}

export async function stripe<T = any>(path: string, init?: { method?: 'GET' | 'POST'; body?: Record<string, string | undefined> }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${key()}`, 'Stripe-Version': VERSION, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: init?.body ? form(init.body) : undefined,
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json?.error?.message ?? 'request failed'}`);
  return json as T;
}

export type Sub = {
  id: string; status: string; current_period_start: number; current_period_end: number;
  metadata?: { plan?: string } | null;
  items?: { data?: { price?: { recurring?: { interval?: string; interval_count?: number } | null } | null }[] } | null;
};
/** Which plan a subscription is on: its metadata, or else its billing interval. */
export function subPlan(s: Sub | null | undefined): 'quarterly' | 'yearly' | null {
  if (!s) return null;
  if (s.metadata?.plan === 'quarterly' || s.metadata?.plan === 'yearly') return s.metadata.plan;
  const r = s.items?.data?.[0]?.price?.recurring;
  return r?.interval === 'year' ? 'yearly' : r?.interval === 'month' && r.interval_count === 3 ? 'quarterly' : null;
}
/** The quarter a quarterly subscription's current period opens (null for yearly or unknown). */
export const subQuarter = (s: Sub | null | undefined, quarterOf: (u: number) => string) => (s && subPlan(s) === 'quarterly' ? quarterOf(s.current_period_start) : null);

/** The customer's live subscription, if any. */
export async function activeSubscription(customer: string): Promise<Sub | null> {
  const list = await stripe<{ data: Sub[] }>(`/subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=10`);
  return list.data.find(s => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due') ?? null;
}

/** The site's address. With a request, the address it actually came in on, so redirects after a
 *  form post stay on the same site (the preview address before the domain is live; a redirect to
 *  another address is also blocked by the CSP's form-action rule). Otherwise NEXT_PUBLIC_SITE_URL. */
export function siteUrl(req?: Request) {
  if (req) {
    const h = req.headers;
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
      const proto = h.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '');
      return `${proto === 'http' ? 'http' : 'https'}://${host}`;
    }
    return new URL(req.url).origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}
