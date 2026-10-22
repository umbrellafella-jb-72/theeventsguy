import Link from 'next/link';
import { Knot, KnotRule } from '@/components/Knot';
import { EventCard } from '@/components/EventCard';
import { getAccess } from '@/lib/access';
import { currentMonthKey, eventsIn, events, monthLabel, monthSummaries, taxonomy, todayKey } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const access = await getAccess();
  const summaries = monthSummaries();
  const cur = currentMonthKey();
  const today = todayKey();
  const upcoming = eventsIn(cur).filter(e => !(e.months.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(e.sortKey) && e.sortKey < today)).slice(0, 4);
  const max = Math.max(...summaries.map(s => s.count));
  const cities = new Set(events.map(e => e.city.replace(/\s*\(.*\)/, ''))).size;
  const free = events.filter(e => e.priceTag === 'Free').length;
  const price = process.env.NEXT_PUBLIC_PRICE_LABEL || 'Monthly subscription';

  return (
    <>
      <section className="hero">
        <Knot className="hero-art" rings={4} r={90} stroke={4} />
        <div className="wrap">
          <div className="eyebrow">UK & Ireland · refreshed monthly</div>
          <h1>Every ecommerce event worth knowing, month by month.</h1>
          <p>Conferences, expos, meetups, retailer dinners and awards — from ExCeL to the Northern Quarter — tagged by format, topic, region and price, so you can plan the year in minutes.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/guide">{access.paid ? 'Open the guide' : `See ${monthLabel(cur)} free`}</Link>
            {!access.paid && <a className="btn btn-secondary" href="#pricing">Subscribe</a>}
          </div>
          <div className="stats">
            <div><b>{events.length}</b><span>events listed</span></div>
            <div><b>{cities}</b><span>towns & cities</span></div>
            <div><b>{free}</b><span>free to attend</span></div>
            <div><b>{taxonomy.topics.length}</b><span>topic tags</span></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="section">
          <div className="section-head">
            <h2>The year ahead</h2>
            <span className="muted">{access.paid ? 'Pick a month to dive in' : `${monthLabel(cur)} is free — the rest is for subscribers`}</span>
          </div>
          <div className="months-grid">
            {summaries.map(s => (
              <Link key={s.key} href={`/guide?month=${s.key}`} className="month-tile">
                <h3>{s.key === 'tbc' ? 'Dates TBC' : s.label}</h3>
                <div className="count">{s.count}</div>
                <div className="bar" aria-hidden="true"><i style={{ width: `${(s.count / max) * 100}%` }} /></div>
                <span className="muted" style={{ fontSize: 13 }}>{s.confirmed} confirmed · {s.free} free</span>
                {!access.paid && s.key !== cur && <span className="locked">Subscribers</span>}
              </Link>
            ))}
          </div>
        </section>

        {upcoming.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>Coming up this month</h2>
              <Link href="/guide" className="btn btn-ghost btn-sm">All of {monthLabel(cur)} →</Link>
            </div>
            <div className="ev-list">{upcoming.map(e => <EventCard key={e.id} e={e} month={cur} />)}</div>
          </section>
        )}

        <KnotRule />

        {!access.paid && (
          <section className="pricing" id="pricing">
            <div>
              <h2 style={{ fontSize: 32, lineHeight: '38px', marginBottom: 16 }}>Plan your events year properly</h2>
              <div className="faq">
                <details open><summary>What’s in the guide?</summary><p>Every UK & Ireland ecommerce, retail and digital marketing event we can find — big expos, invite-only retailer dinners, regional meetups and online member sessions — with dates, venue, organiser, price and links.</p></details>
                <details><summary>How fresh is it?</summary><p>The listings are re-checked and refreshed every month. Each event shows whether its date is confirmed by the organiser, tentative (projected from last year) or still to be announced.</p></details>
                <details><summary>How do the tags work?</summary><p>Each event has one format (conference, expo, meetup, dinner, awards…), any number of topics (AI, Shopify, DTC, payments, agencies…), a region and a price band. Combine them to narrow the year to what matters to you.</p></details>
                <details><summary>Can I cancel?</summary><p>Yes, any time from “My subscription”. You keep access until the end of the period you’ve paid for.</p></details>
              </div>
            </div>
            <div className="price-card">
              <span className="badge badge-torc">Full access</span>
              <div className="amount">{price}</div>
              <ul className="ticks">
                <li>Every month, plus events with dates still to be confirmed</li>
                <li>Filter by format, topic, region, price and date status</li>
                <li>Add events to your calendar in one click</li>
                <li>Refreshed every month</li>
              </ul>
              {access.paymentsReady
                ? <form action="/api/checkout" method="post"><button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Subscribe</button></form>
                : <p className="note">Payments aren’t switched on for this deployment yet (Stripe keys not set).</p>}
              <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>Already subscribed? <Link href="/restore">Sign in on this device</Link>.</p>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
