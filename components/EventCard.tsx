import type { EventItem } from '@/lib/data';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Start date for the given month, from the dates text, falling back to the sort key. */
export function dayIn(e: EventItem, month: string | null): { day: string; mon: string } | null {
  const target = month && month !== 'tbc' ? month : e.months[0];
  if (!target) return null;
  const m = Number(target.slice(5, 7));
  const re = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON[m - 1]}`);
  const hit = e.dates.match(re);
  if (hit) return { day: hit[1], mon: MON[m - 1] };
  const sk = e.sortKey.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (sk && sk[1] === target.slice(5, 7) && Number(sk[2]) >= 1 && Number(sk[2]) <= 31) return { day: String(Number(sk[2])), mon: MON[m - 1] };
  return { day: '—', mon: MON[m - 1] };
}

const statusTone: Record<string, string> = { Confirmed: 'badge-glen', Tentative: 'badge-torc', TBC: '' };
const priceTone: Record<string, string> = { Free: 'badge-glen', 'Invite only': 'badge-heather', 'Members only': 'badge-heather' };

function icsHref(e: EventItem): string | null {
  const sk = e.sortKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!sk || Number(sk[2]) > 12) return null;
  const start = `${sk[1]}${sk[2]}${sk[3]}`;
  const d = new Date(Date.UTC(+sk[1], +sk[2] - 1, +sk[3] + 1));
  const end = d.toISOString().slice(0, 10).replace(/-/g, '');
  const esc = (s: string) => s.replace(/[,;\\]/g, m => `\\${m}`).replace(/\n/g, ' ');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EventGuy//UK ecommerce events//EN', 'BEGIN:VEVENT',
    `UID:${e.id}@eventguy.co.uk`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${esc(e.name)}`,
    `LOCATION:${esc([e.venue, e.city].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc(`${e.dates} (${e.status})${e.website ? ` — ${e.website}` : ''}`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

export function EventCard({ e, month, past }: { e: EventItem; month: string | null; past?: boolean }) {
  const d = dayIn(e, month);
  const ics = e.status !== 'TBC' && e.months.length === 1 ? icsHref(e) : null;
  const where = [e.city, e.venue].filter(Boolean).join(' · ');
  return (
    <article className={`ev${past ? ' is-past' : ''}`}>
      <div className={`ev-date${d ? '' : ' tbc'}`} aria-hidden="true">
        {d ? <><b>{d.day}</b><span>{d.mon}</span></> : <b>TBC</b>}
      </div>
      <div>
        <h3>{e.name}</h3>
        <p className="ev-meta">{e.dates}</p>
        <p className="ev-meta">{where}{e.organiser ? ` — by ${e.organiser}` : ''}</p>
        <div className="ev-badges">
          <span className={`badge ${statusTone[e.status]}`}>{e.status}</span>
          <span className="badge">{e.format}</span>
          <span className={`badge ${priceTone[e.priceTag] || ''}`}>{e.priceTag}</span>
          {past && <span className="badge">Past</span>}
        </div>
        {e.topics.length > 0 && <div className="ev-topics">{e.topics.map(t => <span key={t}>{t}</span>)}</div>}
        <div className="ev-more">
          {e.price && e.priceTag !== 'Price not published' && <>Price: {e.price}. </>}
          {e.frequency && <>{e.frequency}. </>}
          {e.lastEdition && <>Last edition: {e.lastEdition}.</>}
        </div>
        <div className="ev-actions">
          {e.website && <a className="btn btn-secondary btn-sm" href={e.website} target="_blank" rel="noopener noreferrer">Event website<span className="sr-only"> for {e.name}</span></a>}
          {ics && <a className="btn btn-ghost btn-sm" href={ics} download={`${e.id}.ics`}>Add to calendar<span className="sr-only"> — {e.name}</span></a>}
        </div>
      </div>
    </article>
  );
}
