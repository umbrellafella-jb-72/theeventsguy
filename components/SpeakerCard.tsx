import Link from 'next/link';
import type { EventItem, Speaker } from '@/lib/data';
import { eventHref } from '@/lib/data';

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const shortDate = (e: EventItem) => e.dates.replace(/\s*20\d\d/g, '');

export function SpeakerCard({ s, events, example }: { s: Speaker; events: EventItem[]; example?: boolean }) {
  return (
    <article id={`sp-${s.id}`} className="speaker">
      <div className="speaker-head">
        <div className="speaker-plate" aria-hidden="true">{initials(s.name)}</div>
        <div className="speaker-id">
          <h3>{s.name}</h3>
          {(s.role || s.company) && <p className="speaker-role">{[s.role, s.company].filter(Boolean).join(' · ')}</p>}
        </div>
        {example && <span className="badge badge-torc">Example</span>}
      </div>
      {s.bio && <p className="speaker-bio">{s.bio}</p>}
      {[['Speaking at', events.filter(e => e.format !== 'Awards')], ['Judging', events.filter(e => e.format === 'Awards')]].map(([label, list]) => (list as EventItem[]).length > 0 && (
        <div className="speaker-events" key={label as string}>
          <span className="label">{label as string}</span>
          <ul>{(list as EventItem[]).map(e => (
            <li key={e.id}><Link href={e.format === 'Awards' ? `/awards#aw-${e.id}` : eventHref(e)}>{e.name}</Link><span className="muted"> · {shortDate(e)} · {e.city}</span></li>
          ))}</ul>
        </div>
      ))}
      {s.linkedin && (
        <a className="btn btn-secondary btn-sm speaker-li" href={s.linkedin} target="_blank" rel="noopener noreferrer nofollow">
          LinkedIn profile<span className="sr-only"> for {s.name} (opens in a new tab)</span>
        </a>
      )}
    </article>
  );
}
