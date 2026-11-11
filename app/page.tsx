import Link from 'next/link';
import { GuyPortrait, KnotRule, PortScene, Triskele } from '@/components/Art';
import { EventCard } from '@/components/EventCard';
import { FeaturedHero } from '@/components/FeaturedHero';
import { sessionUser } from '@/lib/users';
import { CharityCallout } from '@/components/CharityCallout';
import { CHARITY } from '@/lib/charity';
import { getAccess } from '@/lib/access';
import { RELEASE_DAYS, currentMonthKey, eventsIn, events, featuredFirst, media, monthLabel, monthSummaries, quarterSummaries, todayKey } from '@/lib/data';
import { plans } from '@/lib/plans';
import { YearAhead } from '@/components/YearAhead';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const access = await getAccess();
  const summaries = monthSummaries();
  const cur = currentMonthKey();
  const today = todayKey();
  const notPast = (e: (typeof events)[number]) => !(e.months.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(e.sortKey) && e.sortKey < today);
  const thisMonth = eventsIn(cur).filter(notPast);
  const upcoming = featuredFirst(thisMonth).slice(0, 3);
  // Featured (Partner) events are shown in full to everyone, here and across the site.
  // The hero shows the soonest upcoming featured event.
  const heroEvent = events.filter(e => e.featured && notPast(e)).sort((a, b) => (a.sortKey || '9').localeCompare(b.sortKey || '9'))[0] ?? null;
  const featured = events.filter(e => e.featured && notPast(e) && !upcoming.includes(e) && e !== heroEvent).sort((a, b) => (a.sortKey || '9').localeCompare(b.sortKey || '9')).slice(0, 4);
  const countries = new Set(events.filter(e => e.area === 'Europe' && e.region !== 'Location TBC').map(e => e.region)).size;
  const awards = events.filter(e => e.format === 'Awards').length;
  const user = await sessionUser();

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <GuyPortrait className="hero-guy" size={300} />
          <div className="hero-copy">
          <div className="eyebrow"><Triskele size={18} tone="torc" ground="harbour" ring={false} />UK, Ireland & Europe · refreshed monthly</div>
          <h1>Every ecommerce event worth knowing, month by month.</h1>
          <p>Conferences, expos, meetups, retailer dinners and awards nights — from ExCeL to Barcelona — tagged by area, format, topic and price, plus the podcasts and webinars worth your time between them.</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/guide">{access.paid ? 'Open the guide' : `See ${monthLabel(cur)} free`}</Link>
            {!access.paid && <a className="btn btn-secondary" href="#pricing">Subscribe</a>}
          </div>
          <div className="stats">
            <div><b>{events.length}</b><span>events listed</span></div>
            <div><b>{countries}</b><span>European countries</span></div>
            <div><b>{awards}</b><span>awards with deadlines</span></div>
            <div><b>{media.length}</b><span>podcasts & webinars</span></div>
          </div>
          </div>
        </div>
        <PortScene className="hero-scene" />
      </section>

      <CharityCallout />

      <FeaturedHero e={heroEvent} paid={access.paid} canSave={Boolean(user) || access.paid} today={today} />

      <div className="wrap">
        <section className="section">
          <div className="section-head">
            <h2>The year ahead</h2>
            <span className="muted">{access.paid ? 'Pick a month or quarter to dive in' : user ? `See what’s on every month — ${monthLabel(cur)} is open in full` : <>{monthLabel(cur)} is free to browse — <Link href="/login?next=/guide">register free</Link> to see every month</>}</span>
          </div>
          <YearAhead cur={cur} paid={access.paid} months={summaries.map(({ key, label, count, confirmed, free }) => ({ key, label, count, confirmed, free }))} quarters={quarterSummaries()} />
        </section>

        {upcoming.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2>Coming up this month</h2>
              <Link href={`/guide?month=${cur}`} className="btn btn-ghost btn-sm">All {thisMonth.length} in {monthLabel(cur)} →</Link>
            </div>
            <div className="ev-list">{upcoming.map(e => <EventCard key={e.id} e={e} month={cur} paid={access.paid} />)}</div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>Featured events</h2><Link href="/services#list-event" className="btn btn-ghost btn-sm">Feature your event →</Link></div>
            <div className="ev-list">{featured.map(e => <EventCard key={e.id} e={e} month={null} paid={access.paid} />)}</div>
          </section>
        )}

        <KnotRule />

        {!access.paid && (
          <section className="pricing" id="pricing">
            <div>
              <h2 style={{ fontSize: 32, lineHeight: '38px', marginBottom: 16 }}>Plan your events year properly</h2>
              <div className="faq">
                <details open><summary>What’s in the guide?</summary><p>Every UK, Irish and European ecommerce, retail and digital marketing event we can find — big expos, invite-only retailer dinners, regional meetups, awards with their entry deadlines — plus a directory of podcasts and webinars.</p></details>
                <details><summary>How fresh is it?</summary><p>The listings are re-checked and refreshed every month. Each event shows whether its date is confirmed by the organiser, tentative (projected from last year) or still to be announced.</p></details>
                <details><summary>How do the tags work?</summary><p>Each event has an area (UK & Ireland or Europe), one format (conference, expo, meetup, dinner, awards…), any number of topics (AI, Shopify, DTC, payments, agencies…), a region or country and a price band. Combine them to narrow the year to what matters to you.</p></details>
                <details><summary>Why are details released 30 days ahead?</summary><p>So the guide stays worth paying for. You can see every event’s name, date and city for the year and save it; its venue, prices, booking links and speakers open up {RELEASE_DAYS} days before it starts (for awards, before the entry deadline or ceremony). Saved events fill in on your shortlist and calendar feed automatically.</p></details>
                <details><summary>Can I cancel?</summary><p>Yes, any time from your account. You keep access until the end of the period you’ve paid for.</p></details>
              </div>
            </div>
            <div className="plans">
              <ul className="ticks plans-ticks">
                <li>Every event’s venue, price, booking link, speakers and sponsors — released {RELEASE_DAYS} days ahead</li>
                <li>Names, dates and cities for the whole year, so you can plan and save early</li>
                <li>Awards deadlines, judges, fees and entry links</li>
                <li>The full podcasts & webinars directory</li>
                <li>Calendar sync, reminders and new-event emails</li>
                <li>{CHARITY.share} of your subscription goes to {CHARITY.name}</li>
              </ul>
              <div className="plan-grid">
                {plans().map(pl => (
                  <div key={pl.key} className={`price-card plan${pl.best ? ' is-best' : ''}`}>
                    <span className={`badge ${pl.best ? 'badge-torc' : 'badge-glen'}`}>{pl.best ? 'Best value' : 'Flexible'}</span>
                    <h3 className="plan-name">{pl.name}</h3>
                    <div className="amount">{pl.price}<span className="per"> {pl.per}</span></div>
                    <p className="muted plan-note">{pl.note}</p>
                    {access.paymentsReady && pl.priceId
                      ? <form action="/api/checkout" method="post"><input type="hidden" name="plan" value={pl.key} /><button className={`btn ${pl.best ? 'btn-primary' : 'btn-secondary'}`} type="submit" style={{ width: '100%' }}>Choose {pl.name.toLowerCase()}</button></form>
                      : <p className="note">Not available yet.</p>}
                  </div>
                ))}
              </div>
              <p className="muted plans-foot">Both plans get the same access. Already a member? <Link href="/login">Sign in</Link>.</p>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
