import Link from 'next/link';
import { SpeakerAvatar } from './SpeakerAvatar';

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/** What a speaker card needs about each event (public fields only, so it can go to the browser). */
export type SpeakerEvent = { id: string; name: string; href: string; when: string; city: string; award: boolean };
export type SpeakerView = {
  id: string; name: string; role: string | null; company: string | null; bio: string | null; linkedin: string | null;
  topics: string[]; image: string | null; featured: boolean; openTo: string[]; events: SpeakerEvent[];
  enquire: boolean; portal: boolean;
};

export function SpeakerCard({ s, example, children }: { s: SpeakerView; example?: boolean; children?: React.ReactNode }) {
  const talks = s.events.filter(e => !e.award), judging = s.events.filter(e => e.award);
  return (
    <article id={`sp-${s.id}`} className={`speaker${s.featured ? ' is-featured' : ''}`}>
      {(s.featured || example) && <span className={`badge ${example ? 'badge-torc' : 'badge-heather'} speaker-flag`}>{example ? 'Example' : 'Spotlight'}</span>}
      <SpeakerAvatar id={s.id} name={s.name} image={s.image} size={128} />
      <div className="speaker-id">
        <h3>{s.name}</h3>
        {(s.role || s.company) && <p className="speaker-role">{[s.role, s.company].filter(Boolean).join(' · ')}</p>}
      </div>
      {s.topics.length > 0 && (
        <div className="speaker-topics">
          <span className="label">Specialities</span>
          <ul>{s.topics.map(t => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {s.bio && <p className="speaker-bio">{s.bio}</p>}
      {s.openTo.length > 0 && <p className="speaker-open"><b>Open to:</b> {s.openTo.join(', ')}</p>}
      {([['Speaking at', talks], ['Judging', judging]] as const).map(([label, list]) => list.length > 0 && (
        <div className="speaker-events" key={label}>
          <span className="label">{label}</span>
          <ul>{list.map(e => (
            <li key={e.id}><Link href={e.href}>{e.name}</Link><span className="muted"> · {e.when} · {e.city}</span></li>
          ))}</ul>
        </div>
      ))}
      <div className="speaker-actions">
        {s.linkedin
          ? <a className="btn btn-primary btn-sm speaker-li" href={s.linkedin} target="_blank" rel="noopener noreferrer nofollow">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C20.6 8.65 21 11.2 21 14.5V21h-4v-5.8c0-1.4 0-3.2-1.95-3.2S12.8 13.5 12.8 15.1V21H9z" /></svg>
              LinkedIn profile<span className="sr-only"> for {s.name} (opens in a new tab)</span>
            </a>
          : <span className="muted speaker-noli">LinkedIn to come</span>}
        {children}
      </div>
    </article>
  );
}
