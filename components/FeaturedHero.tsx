import Link from 'next/link';
import type { EventItem } from '@/lib/data';
import { PortScene } from './Art';
import { EventActions } from './EventActions';
import { dayIn } from './EventCard';
import { HeroVideo } from './HeroVideo';

const sceneFor = (e: EventItem) => (e.format === 'Awards' ? 'chimneys' : /expo|trade/i.test(e.format) ? 'crane' : /festival/i.test(e.format) ? 'containers' : 'bridge');
const daysUntil = (sortKey: string, today: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sortKey)) return null;
  const d = (Date.UTC(+sortKey.slice(0, 4), +sortKey.slice(5, 7) - 1, +sortKey.slice(8, 10)) - Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))) / 864e5;
  return d >= 0 ? Math.round(d) : null;
};

/** Full-width homepage hero for the next featured (Partner) event: its own photo or looping video
 *  when the sheet has one, otherwise a slowly panning port scene. With no featured event, the
 *  slot advertises itself to organisers. Featured events are shown in full to everyone. */
export function FeaturedHero({ e, paid, canSave, today }: { e: EventItem | null; paid: boolean; canSave: boolean; today: string }) {
  if (!e) {
    return (
      <section className="fhero is-empty" aria-labelledby="fhero-title">
        <div className="fhero-media" aria-hidden="true"><PortScene className="fhero-scene" scene="skyline" /></div>
        <div className="fhero-shade" aria-hidden="true" />
        <div className="wrap fhero-body">
          <span className="fhero-flag">Featured event</span>
          <h2 id="fhero-title">Your event, here.</h2>
          <p className="fhero-desc">The featured slot puts one event in front of everyone who opens The Events Guy — full width, at the top of the page, with your own photo or video.</p>
          <div className="fhero-actions"><Link className="btn btn-primary" href="/services#list-event">Feature your event</Link></div>
        </div>
      </section>
    );
  }
  const d = dayIn(e, null);
  const until = daysUntil(e.sortKey, today);
  const where = [e.venue, e.city].filter(Boolean).join(', ');
  const time = e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : '';
  return (
    <section className="fhero" aria-labelledby="fhero-title">
      <div className="fhero-media" aria-hidden="true">
        {e.heroVideo ? (
          <HeroVideo src={e.heroVideo} poster={e.heroImage ?? undefined} />
        ) : e.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="fhero-img" src={e.heroImage} alt="" />
        ) : <PortScene className="fhero-scene" scene={sceneFor(e)} />}
      </div>
      <div className="fhero-shade" aria-hidden="true" />
      <div className="wrap fhero-body">
        <div className="fhero-top">
          <span className="fhero-flag">Featured event</span>
          {until !== null && <span className="fhero-count">{until === 0 ? 'Today' : until === 1 ? 'Tomorrow' : `In ${until} days`}</span>}
        </div>
        <div className="fhero-main">
          {d && <div className="fhero-plate" aria-hidden="true"><b>{d.day}</b><span>{d.mon}</span></div>}
          <div>
            <h2 id="fhero-title"><Link href={`/events/${e.id}`}>{e.name}</Link></h2>
            <p className="fhero-when">{e.dates}{time}</p>
            <p className="fhero-where">{where}{e.organiser ? ` — by ${e.organiser}` : ''}</p>
          </div>
        </div>
        {e.description && <p className="fhero-desc">{e.description}</p>}
        <div className="fhero-actions">
          {(e.bookingUrl || e.website) && <a className="btn btn-primary" href={e.bookingUrl || e.website!} target="_blank" rel="noopener noreferrer">{e.bookingUrl ? 'Book tickets' : 'Event website'}</a>}
          <Link className="btn btn-secondary fhero-more" href={`/events/${e.id}`}>See the event</Link>
          <EventActions e={e} paid={paid} full canSave={canSave} />
        </div>
      </div>
    </section>
  );
}
