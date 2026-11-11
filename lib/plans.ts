// Membership plans. Each plan is a recurring Price in Stripe (Products → your product → Add price):
//   Quarterly: recurring, every 3 months  → STRIPE_PRICE_QUARTERLY
//   Yearly:    recurring, every 12 months → STRIPE_PRICE_YEARLY
// The labels shown on the site come from NEXT_PUBLIC_PRICE_QUARTERLY / NEXT_PUBLIC_PRICE_YEARLY
// (e.g. "£45") so the page always matches what Stripe charges. Both plans get the same access —
// including the 30-day rolling release — so paying for a year never unlocks the year's data at once.
export type PlanKey = 'quarterly' | 'yearly';
export type Plan = { key: PlanKey; name: string; price: string; per: string; note: string; priceId: string | undefined; best?: boolean };

export function plans(): Plan[] {
  return [
    { key: 'quarterly', name: 'Quarterly', price: process.env.NEXT_PUBLIC_PRICE_QUARTERLY || 'Quarterly', per: 'every 3 months', note: 'Billed every 3 months. Cancel any time.', priceId: process.env.STRIPE_PRICE_QUARTERLY || process.env.STRIPE_PRICE_ID },
    { key: 'yearly', name: 'Yearly', price: process.env.NEXT_PUBLIC_PRICE_YEARLY || 'Yearly', per: 'a year', note: process.env.NEXT_PUBLIC_YEARLY_SAVING || 'Billed once a year. Cancel any time.', priceId: process.env.STRIPE_PRICE_YEARLY, best: true },
  ];
}
export const planFor = (key: string | null | undefined) => plans().find(p => p.key === key && p.priceId) ?? null;
export const plansReady = () => plans().some(p => p.priceId);
