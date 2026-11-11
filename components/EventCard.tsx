import type { EventItem, SpeakerRef } from '@/lib/data';
import { RELEASE_DAYS, releaseLabel } from '@/lib/release';
import { EventActions } from './EventActions';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Start date for the given month, from the dates text, falling back to the sort key. */
export function dayIn(e: EventItem, month: string | null): { day: string; mon: string } | null {
  const target = month && month !== 'tbc' ? month : e.months[0];
  if (!target) return null;
  const m = Number(target.slice(5, 7));
  const re = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON[m - 1]}`);
  const range = e.dates.match(new RegExp(`\\b(\\d{1,2})(?:\\s*[-–]\\s*|\\s+to\\s+(?:[A-Z][a-z]{2}\\s+)?)\\d{1,2}\\s+${MON[m - 1]}`));
  if (range) return { day: range[1], mon: MON[m - 1] };
  const hit = e.dates.match(re);
  if (hit) return { day: hit[1], mon: MON[m - 1] };
  const sk = e.sortKey.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (sk && sk[1] === target.slice(5, 7) && Number(sk[2]) >= 1 && Number(sk[2]) <= 31) return { day: String(Number(sk[2])), mon: MON[m - 1] };
  return { day: '—', mon: MON[m - 1] };
}

const statusTone: Record<string, string> = { Confirmed: 'badge-glen', Tentative: 'badge-torc', TBC: '' };
const priceTone: Record<string, string> = { Free: 'badge-glen', 'Invite only': 'badge-heather', 'Members only': 'badge-heather' };

/** One event in the guide. `e.locked` = a visitor's teaser: name, dates, city, sector and
 *  organiser only, with what membership adds. Featured events always show in full. */
export function EventCard({ e, month, past, speakers, paid = false, canSave = paid }: { e: EventItem; month: string | null; past?: boolean; speakers?: SpeakerRef[]; paid?: boolean; canSave?: boolean }) {
  const d = dayIn(e, month);
  const where = [e.city, e.venue].filter(Boolean).join(' · ');
  const time = e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ''} local time` : null;
  const book = e.bookingUrl || null;
  return (
    <article id={`ev-${e.id}`} className={`ev${past ? ' is-past' : ''}${e.featured ? ' is-featured' : ''}${e.locked ? ' is-locked' : ''}`}>
      <div className={`ev-date${d ? '' : ' tbc'}`} aria-hidden="true">
        {d ? <><b>{d.day}</b><span>{d.mon}</span></> : <b>TBC</b>}
      </div>
      <div>
        {e.featured && <span className="ev-flag">Featured</span>}
        <h3><a className="ev-link" href={`/events/${e.id}`}>{e.name}</a></h3>
        <p className="ev-meta">{e.dates}{time ? ` · ${time}` : ''}</p>
        <p className="ev-meta">{where}{e.organiser ? ` — by ${e.organiser}` : ''}</p>
        <div className="ev-badges">
          <span className={`badge ${statusTone[e.status]}`}>{e.status}</span>
          <span className="badge">{e.format}</span>
          {e.area !== 'UK & Ireland' && <span className="badge">{e.area === 'Europe' ? e.region : e.area}</span>}
          {!e.locked && <span className={`badge ${priceTone[e.priceTag] || ''}`}>{e.priceTag}</span>}
          {past && <span className="badge">Past</span>}
        </div>
        <div className="ev-topics">
          {e.sectors.filter(s => s !== 'Cross-sector').map(t => <span key={t} className="is-sector">{t}</span>)}
          {e.topics.filter(t => !e.sectors.includes(t)).map(t => <span key={t}>{t}</span>)}
        </div>
        {e.locked ? (
          paid
            ? <p className="ev-lock">{e.opensOn ? <>Full details released <b>{releaseLabel(e.opensOn)}</b>, {RELEASE_DAYS} days ahead.</> : <>Full details released {RELEASE_DAYS} days before it, once the date is confirmed.</>} Save it now and it fills in on your shortlist automatically.</p>
            : <p className="ev-lock">Members see the venue, price, booking link, speakers and sponsors, and can save it and add it to their calendar. <a href="/#pricing">Become a member</a></p>
        ) : (
          <>
            {e.description && <p className="ev-desc">{e.description}</p>}
            {speakers && speakers.length > 0 && <p className="ev-cats ev-speakers"><b>Speakers:</b> {speakers.map((s, i) => <span key={s.id}>{i ? ', ' : ''}<a href={`/speakers#sp-${s.id}`}>{s.name}</a></span>)}</p>}
            {e.sponsors && e.sponsors.length > 0 && <p className="ev-cats"><b>Sponsors:</b> {e.sponsors.join(', ')}</p>}
            {e.categories && <p className="ev-cats"><b>Categories:</b> {e.categories}</p>}
            {e.entryDeadline && <p className="ev-cats"><b>Entries:</b> {e.entryDeadline}</p>}
            <div className="ev-more">
              {e.price && e.priceTag !== 'Price not published' && <>Price: {e.price}. </>}
              {e.frequency && <>{e.frequency}. </>}
              {e.lastEdition && <>Last edition: {e.lastEdition}.</>}
            </div>
          </>
        )}
        <div className="ev-actions">
          {!e.locked && book && <a className="btn btn-primary btn-sm" href={book} target="_blank" rel="noopener noreferrer">Book tickets<span className="sr-only"> for {e.name}</span></a>}
          {!e.locked && e.website && <a className="btn btn-secondary btn-sm" href={e.website} target="_blank" rel="noopener noreferrer">Event website<span className="sr-only"> for {e.name}</span></a>}
          {!e.locked && e.format === 'Awards' && <a className="btn btn-ghost btn-sm" href={`/awards#aw-${e.id}`}>Judges & how to enter<span className="sr-only"> — {e.name}</span></a>}
          <EventActions e={e} paid={paid} full={paid || !e.locked} canSave={canSave} />
        </div>
      </div>
    </article>
  );
}
