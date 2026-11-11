import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccess } from '@/lib/access';
import { RELEASE_DAYS, eventById, fullFor, monthLabel, opensOn, releaseLabel, speakers as allSpeakers, teaser } from '@/lib/data';
import { eventDates } from '@/lib/calendar';
import { EventActions } from '@/components/EventActions';
import { PrintButton } from '@/components/PrintButton';
import { PortScene } from '@/components/Art';
import { dayIn } from '@/components/EventCard';

export const dynamic = 'force-dynamic';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk').replace(/\/$/, '');

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ members?: string }> };

// Public facts only in titles, descriptions and structured data, so search results never show locked details.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = eventById.get((await params).id);
  if (!e) return { title: 'Event not found — The Events Guy' };
  const when = e.dates || (e.months[0] ? monthLabel(e.months[0]) : 'Date to be confirmed');
  const desc = `${e.name}: ${when}, ${e.city}. ${e.format}${e.organiser ? ` by ${e.organiser}` : ''}. ${e.sectors.filter(s => s !== 'Cross-sector').join(', ') || 'Ecommerce'} — on The Events Guy, the month-by-month guide to ecommerce events.`;
  return { title: `${e.name} — ${when}, ${e.city} | The Events Guy`, description: desc, alternates: { canonical: `/events/${e.id}` }, openGraph: { title: e.name, description: desc, url: `${SITE}/events/${e.id}`, type: 'website' } };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const e = eventById.get(id);
  if (!e) notFound();
  const access = await getAccess();
  const full = fullFor(e, access.paid);
  const opens = access.paid && !full ? opensOn(e) : null;
  const d = eventDates(e);
  const plate = dayIn(e, null);
  const evSpeakers = full ? allSpeakers.filter(s => s.events.includes(e.id)) : [];
  const sectors = e.sectors.filter(s => s !== 'Cross-sector');

  // schema.org Event: public facts always; the rest only when the page shows it.
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': 'Event', name: e.name, url: `${SITE}/events/${e.id}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: full && e.venue ? e.venue : e.city, address: { '@type': 'PostalAddress', addressLocality: e.city, addressCountry: e.area === 'UK & Ireland' ? (/dublin|cork|galway|ireland/i.test(e.city) ? 'IE' : 'GB') : e.region } },
    ...(d ? { startDate: e.startTime ? `${d.start}T${e.startTime}` : d.start, endDate: e.endTime ? `${d.end}T${e.endTime}` : d.end } : {}),
    ...(e.organiser ? { organizer: { '@type': 'Organization', name: e.organiser, ...(full && e.organiserUrl ? { url: e.organiserUrl } : {}) } } : {}),
    ...(full && e.description ? { description: e.description } : {}),
    ...(full && (e.bookingUrl || e.website) ? { offers: { '@type': 'Offer', url: e.bookingUrl || e.website, ...(e.priceTag === 'Free' ? { price: 0, priceCurrency: 'GBP' } : {}) } } : {}),
    ...(evSpeakers.length ? { performer: evSpeakers.map(s => ({ '@type': 'Person', name: s.name })) } : {}),
    ...(full && e.sponsors?.length ? { sponsor: e.sponsors.map(n => ({ '@type': 'Organization', name: n })) } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <section className="ev-hero">
        <div className="wrap ev-hero-grid">
          <div>
            <p className="eyebrow"><Link href={e.months[0] ? `/guide?month=${e.months[0]}#ev-${e.id}` : '/guide'}>The guide</Link> · {e.format}{e.featured ? ' · Featured' : ''}</p>
            <h1>{e.name}</h1>
            <p className="ev-hero-when">{e.dates || 'Date to be confirmed'}{full && e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''} local time` : ''}</p>
            <p className="ev-hero-where">{full && e.venue ? `${e.venue}, ` : ''}{e.city}{e.area === 'Europe' ? `, ${e.region}` : ''}</p>
            <div className="ev-badges">
              <span className={`badge ${e.status === 'Confirmed' ? 'badge-glen' : e.status === 'Tentative' ? 'badge-torc' : ''}`}>{e.status}</span>
              {sectors.map(s => <span key={s} className="badge">{s}</span>)}
              {e.featured && <span className="badge badge-torc">Featured</span>}
            </div>
          </div>
          <div className="ev-hero-plate" aria-hidden="true">{plate ? <><b>{plate.day}</b><span>{plate.mon}</span></> : <b>TBC</b>}</div>
        </div>
        <div className="ev-hero-scene" aria-hidden="true"><PortScene scene={e.format === 'Awards' ? 'chimneys' : /expo|trade/i.test(e.format) ? 'crane' : 'bridge'} /></div>
      </section>

      <div className="wrap ev-page">
        <div className="ev-main">
          {sp.members && !full && <p className="note banner">Adding events to your calendar is for members — join below and every event opens up.</p>}
          <dl className="ev-facts">
            <dt>When</dt><dd>{e.dates || 'To be confirmed'}{e.status !== 'Confirmed' && <span className="muted"> · {e.status === 'Tentative' ? 'projected from the last edition' : 'not announced yet'}</span>}</dd>
            <dt>Where</dt><dd>{e.city}{e.area === 'Europe' ? `, ${e.region}` : ''}</dd>
            <dt>Category</dt><dd>{e.format}</dd>
            <dt>Industry</dt><dd>{e.sectors.join(', ')}</dd>
            {e.organiser && <><dt>Organiser</dt><dd>{full && e.organiserUrl ? <a href={e.organiserUrl} target="_blank" rel="noopener noreferrer">{e.organiser}</a> : e.organiser}</dd></>}
          </dl>

          {full ? (
            <>
              {e.description && <p className="ev-page-desc">{e.description}</p>}
              <dl className="ev-facts">
                {e.venue && <><dt>Venue</dt><dd>{e.venue}</dd></>}
                {e.startTime && <><dt>Time</dt><dd>{e.startTime}{e.endTime ? `–${e.endTime}` : ''} local time</dd></>}
                <dt>Tickets</dt><dd>{e.price || 'Price not published'}</dd>
                {e.topics.length > 0 && <><dt>Topics</dt><dd>{e.topics.join(', ')}</dd></>}
                {evSpeakers.length > 0 && <><dt>Speakers</dt><dd>{evSpeakers.map((s, i) => <span key={s.id}>{i ? ', ' : ''}<Link href={`/speakers#sp-${s.id}`}>{s.name}</Link>{s.company ? ` (${s.company})` : ''}</span>)}</dd></>}
                {e.sponsors && e.sponsors.length > 0 && <><dt>Sponsors</dt><dd>{e.sponsors.join(', ')}</dd></>}
                {e.categories && <><dt>Award categories</dt><dd>{e.categories}</dd></>}
                {e.entryDeadline && <><dt>Entries</dt><dd>{e.entryDeadline} · <Link href={`/awards#aw-${e.id}`}>Judges & how to enter</Link></dd></>}
                {e.frequency && <><dt>How often</dt><dd>{e.frequency}</dd></>}
                {e.lastEdition && <><dt>Last edition</dt><dd>{e.lastEdition}</dd></>}
                {(e.website || (e.socials && e.socials.length > 0)) && <><dt>Online</dt><dd className="ev-links">
                  {e.website && <a href={e.website} target="_blank" rel="noopener noreferrer">Event website</a>}
                  {e.socials?.map(s => <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}
                </dd></>}
              </dl>
              <div className="ev-actions">
                {(e.bookingUrl || e.website) && <a className="btn btn-primary" href={e.bookingUrl || e.website!} target="_blank" rel="noopener noreferrer">{e.bookingUrl ? 'Book tickets' : 'Tickets & registration'}</a>}
                <EventActions e={e} paid={access.paid} full />
                <PrintButton />
              </div>
              <p className="print-brand">Brought to you by The Events Guy · theeventsguy.co.uk · Printed for a member — please don’t redistribute.</p>
            </>
          ) : (
            access.paid ? (
            <div className="lock-panel ev-page-lock">
              <h2>{opens ? `Full details released ${releaseLabel(opens)}` : 'Full details released once the date is set'}</h2>
              <p>Members get each event’s venue, prices, booking link, speakers and sponsors {RELEASE_DAYS} days before it starts{opens ? '' : ' — this one doesn’t have a confirmed date yet'}. Save it now and it’ll fill in on your shortlist and calendar feed automatically.</p>
              <div className="ev-actions" style={{ marginTop: 16 }}><EventActions e={teaser(e, true)} paid full={false} canSave /></div>
            </div>
            ) : (
            <div className="lock-panel ev-page-lock">
              <h2>The full listing is for members</h2>
              <ul className="ticks">
                <li>Venue, times and ticket prices</li>
                <li>The booking link and the organiser’s website and socials</li>
                <li>Speakers and sponsors</li>
                <li>Save it to your shortlist and add it to Google, Outlook or Apple Calendar</li>
                <li>Reminders before it starts, and an email when new events are added</li>
              </ul>
              <Link className="btn btn-primary" href="/#pricing">See membership plans</Link>
              <p className="muted" style={{ marginTop: 12 }}>Already a member? <Link href="/login">Sign in</Link>.</p>
              <div className="ev-actions" style={{ marginTop: 16 }}><EventActions e={teaser(e)} paid={false} full={false} /></div>
            </div>
            )
          )}
        </div>
        <aside className="ev-side">
          <div className="ev-side-card">
            <h2>Running this event?</h2>
            <p>Every approved event is listed free. Partners are featured in full to everyone, at the top of their month.</p>
            <Link className="btn btn-secondary btn-sm" href="/services#enquire">List or feature it</Link>
          </div>
        </aside>
      </div>
    </>
  );
}
