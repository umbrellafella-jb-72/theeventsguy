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

export type Sub = { id: string; status: string; current_period_end: number };

/** The customer's live subscription, if any. */
export async function activeSubscription(customer: string): Promise<Sub | null> {
  const list = await stripe<{ data: Sub[] }>(`/subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=10`);
  return list.data.find(s => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due') ?? null;
}

export function siteUrl(req?: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || (req ? new URL(req.url).origin : 'http://localhost:3000');
}
