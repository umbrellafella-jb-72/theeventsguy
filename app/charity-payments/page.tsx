import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Fill } from '@/components/Fill';
import { CHARITY } from '@/lib/charity';
import { CHARITY_PAYMENTS, OPERATOR } from '@/lib/legal';

export const metadata = { title: 'Charity payments — The Events Guy' };

export default function CharityPayments() {
  return (
    <>
      <PageHero eyebrow="Charity payments" scene="chimneys" title={`Where your ${CHARITY.share} goes`}
        intro="How much of your subscription goes to charity, how it’s worked out and when it’s paid." />
      <div className="wrap section prose">
        <p className="muted">Last updated {OPERATOR.updated}.</p>

        <h2>The charity</h2>
        <p><a href={CHARITY.url} target="_blank" rel="noopener noreferrer">{CHARITY.name}</a>, registered charity number {CHARITY.number} (England and Wales). {CHARITY.blurb}</p>

        <h2>How much goes to the charity</h2>
        <p><b>{CHARITY.share} of every subscription payment</b>, quarterly or yearly, worked out <Fill v={CHARITY_PAYMENTS.basis} />.</p>
        <p>Refunded payments aren’t included, because the money is returned to you.</p>

        <h2>When it’s paid</h2>
        <p>We pay the charity {CHARITY_PAYMENTS.frequency}, by bank transfer, from <Fill v={OPERATOR.name} />. Payments go straight to the charity: you don’t donate directly, so your subscription isn’t eligible for Gift Aid.</p>

        <h2>Checking it</h2>
        <p>We’ll publish the total paid to the charity here after each payment, and can show the charity’s receipt on request. Questions: <Fill v={OPERATOR.email} />.</p>
        <div className="tier-wrap"><table className="tiers cookie-table"><thead><tr><th scope="col">Period</th><th scope="col">Paid to the charity</th></tr></thead>
          <tbody><tr><td colSpan={2} className="muted">The first payment will appear here.</td></tr></tbody></table></div>

        <p className="muted" style={{ marginTop: 24 }}>The Events Guy isn’t a charity. We’re a business that gives part of its income to one. <Link href="/#pricing">See membership</Link>.</p>
      </div>
    </>
  );
}
