import type { EventItem, Judge } from '@/lib/data';
import { ENTRY_TONE } from '@/lib/awards';
import { dayIn } from './EventCard';
import { initials } from './SpeakerCard';

export type EntryInfo = { state: 'open' | 'expected' | 'closed' | 'unknown'; next: string | null; label: string; days: number | null; text: string | null };
export type AwardView = EventItem & { entry: EntryInfo; judgeList: Judge[]; exampleJudges?: boolean };

const statusTone: Record<string, string> = { Confirmed: 'badge-glen', Tentative: 'badge-torc', TBC: '' };

export function AwardCard({ a }: { a: AwardView }) {
  const d = dayIn(a, null);
  const where = [a.city, a.venue].filter(Boolean).join(' · ');
  const enter = a.entryUrl || a.website;
  const tone = (ENTRY_TONE as Record<string, string>)[a.entry.state] ?? '';
  const soon = a.entry.state === 'open' && a.entry.days !== null && a.entry.days <= 14;
  return (
    <article id={`aw-${a.id}`} className="ev award">
      <div className={`ev-date${d ? '' : ' tbc'}`} aria-hidden="true">
        {d ? <><b>{d.day}</b><span>{d.mon}</span></> : <b>TBC</b>}
      </div>
      <div>
        <h3><a className="ev-link" href={`/events/${a.id}`}>{a.name}</a></h3>
        <p className="ev-meta">Ceremony: {a.dates}</p>
        <p className="ev-meta">{where}{a.organiser ? ` — by ${a.organiser}` : ''}</p>
        <div className="ev-badges">
          <span className={`badge ${soon ? 'badge-heather' : tone}`}>{a.entry.label}</span>
          <span className={`badge ${statusTone[a.status]}`}>Ceremony {a.status.toLowerCase()}</span>
          {a.scope && <span className="badge">{a.scope}</span>}
        </div>
        {a.topics.length > 0 && <div className="ev-topics">{a.topics.map(t => <span key={t}>{t}</span>)}</div>}
        {a.categories && <p className="ev-cats"><b>Categories:</b> {a.categories}</p>}

        <div className="aw-judges">
          <h4>Judges{a.exampleJudges && <span className="badge badge-torc">Example</span>}</h4>
          {a.judgeList.length > 0 ? (
            <ul>{a.judgeList.map(j => (
              <li key={j.name}>
                <span className="aw-plate" aria-hidden="true">{initials(j.name)}</span>
                <span>
                  {j.speakerId ? <a href={`/speakers#sp-${j.speakerId}`}>{j.name}</a> : <b>{j.name}</b>}
                  {(j.role || j.company) && <span className="muted"> · {[j.role, j.company].filter(Boolean).join(', ')}</span>}
                  {j.linkedin && <> · <a href={j.linkedin} target="_blank" rel="noopener noreferrer nofollow">LinkedIn<span className="sr-only"> for {j.name}</span></a></>}
                </span>
              </li>
            ))}</ul>
          ) : <p className="muted">Not announced yet. Organisers usually name the panel when entries open{a.website ? ', on the awards site' : ''}.</p>}
        </div>

        <details className="aw-how">
          <summary>How to enter</summary>
          <dl>
            <dt>Deadlines</dt><dd>{a.entry.text || 'Not published yet — check the organiser’s site.'}</dd>
            <dt>Entry fee</dt><dd>{a.price || 'Not published'}</dd>
            {a.eligibility && <><dt>Who can enter</dt><dd>{a.eligibility}</dd></>}
            <dt>How</dt><dd>{a.howToEnter || 'Online, through the organiser’s entry portal. Pick your categories, answer each judging question and add your evidence. Our step-by-step guide is at the foot of this page.'}</dd>
          </dl>
          <a className="btn btn-ghost btn-sm" href="#how-to-enter">Read the how-to-enter guide</a>
        </details>

        <div className="ev-actions">
          {enter && <a className="btn btn-secondary btn-sm" href={enter} target="_blank" rel="noopener noreferrer">{a.entry.state === 'open' ? 'Enter on the organiser’s site' : 'Awards website'}<span className="sr-only"> for {a.name}</span></a>}
        </div>
      </div>
    </article>
  );
}
