import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAccess, longToken } from '@/lib/access';
import { sessionUser } from '@/lib/users';
import { siteUrl } from '@/lib/stripe';
import { CHARITY } from '@/lib/charity';
import { GuyPortrait, KnotRule, Triskele } from '@/components/Art';

// Where Stripe Checkout lands after a successful subscription (via /api/checkout/confirm).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thanks for subscribing — The Events Guy', robots: { index: false, follow: false } };

const UNLOCKED = [
  ['Every month, in full', 'The whole year ahead — not just this month — with nothing held back.'],
  ['Venue, price and booking links', 'Everything you need to decide and book, on every event.'],
  ['Speakers and sponsors', 'See who’s on stage and who’s backing each event.'],
  ['Calendar sync', 'Add events to Google, Outlook or Apple — or subscribe to your shortlist as a live feed.'],
  ['Reminders and new-event emails', 'A nudge before your shortlisted events, and a digest when new ones land.'],
];

export default async function WelcomePage() {
  const a = await getAccess();
  if (!a.paid) redirect('/#pricing');
  if (a.open) redirect('/guide');
  const u = await sessionUser();
  const renews = a.paidUntil ? new Date(a.paidUntil * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const feed = u ? `${siteUrl()}/api/calendar/${longToken(u.id, 'feed')}` : null;
  const first = u?.name?.split(' ')[0];

  return (
    <>
      <section className="hero welcome-hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow"><Triskele size={18} tone="torc" ring={false} ground="harbour" /> Membership active</div>
            <h1>Thank you{first ? `, ${first}` : ''}. You’re in.</h1>
            <p>Every month of the guide is now unlocked. Here’s what you’ve got, and a few quick steps to make the most of it.</p>
            <div className="welcome-ctas">
              <Link className="btn btn-primary" href="/guide">Open the full guide</Link>
              <Link className="btn btn-secondary" href="/awards">Browse the awards</Link>
            </div>
          </div>
          <GuyPortrait className="hero-guy" size={300} />
        </div>
      </section>

      <div className="wrap section welcome">
        <dl className="welcome-facts">
          {u && <div><dt>Signed in as</dt><dd>{u.email}</dd></div>}
          {renews && <div><dt>Renews on</dt><dd>{renews}</dd></div>}
          <div><dt>Receipt</dt><dd>Stripe has emailed it to you</dd></div>
        </dl>

        <section aria-labelledby="unlocked-title">
          <h2 id="unlocked-title" className="section-title">What’s unlocked</h2>
          <ul className="welcome-grid">
            {UNLOCKED.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
          </ul>
        </section>

        <KnotRule />

        <section aria-labelledby="next-title">
          <h2 id="next-title" className="section-title">Get set up in two minutes</h2>
          <ol className="welcome-steps">
            <li>
              <h3>Find your events</h3>
              <p>Filter by month, city, category and industry, then save the ones you want to your shortlist.</p>
              <Link className="btn btn-secondary btn-sm" href="/guide">Go to the guide</Link>
            </li>
            <li>
              <h3>Put them in your calendar</h3>
              <p>Subscribe to your shortlist once and it stays in sync — new saves appear automatically.</p>
              {feed
                ? <div className="tool-row">
                    <a className="btn btn-secondary btn-sm" href={feed.replace(/^https?:/, 'webcal:')}>Apple Calendar / Outlook</a>
                    <a className="btn btn-secondary btn-sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.replace(/^https?:/, 'webcal:'))}`} target="_blank" rel="noopener noreferrer">Google Calendar</a>
                  </div>
                : <Link className="btn btn-secondary btn-sm" href="/login?next=/account">Sign in for your feed</Link>}
            </li>
            <li>
              <h3>Choose your emails</h3>
              <p>Reminders before your events and a digest of new ones are on by default. Change them any time.</p>
              <Link className="btn btn-secondary btn-sm" href="/account">Email settings</Link>
            </li>
            <li>
              <h3>Speak, sponsor or organise?</h3>
              <p>Add a role to your account to publish a speaker or sponsor profile, or post sponsorship opportunities.</p>
              <Link className="btn btn-secondary btn-sm" href="/account">Add a role</Link>
            </li>
          </ol>
        </section>

        <section className="welcome-charity">
          <div className="charity-share" aria-hidden="true">{CHARITY.share}</div>
          <p><strong>Your subscription is already doing good.</strong> {CHARITY.share} of it goes to <a href={CHARITY.url} target="_blank" rel="noopener noreferrer">{CHARITY.name}</a> (registered charity {CHARITY.number}).</p>
        </section>

        <div className="welcome-billing">
          Need an invoice, a new card or to cancel? <form action="/api/portal" method="post"><button className="linkish" type="submit">Manage billing</button></form>
        </div>
      </div>
    </>
  );
}
