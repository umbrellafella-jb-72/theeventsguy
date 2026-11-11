'use client';
import { useMemo, useState } from 'react';
import { SpeakerCard, type SpeakerView } from './SpeakerCard';

// The speakers portal: search by name, company or topic, and filter by speciality.
export function SpeakerDirectory({ speakers, example, extras }: { speakers: SpeakerView[]; example?: boolean; extras?: Record<string, React.ReactNode> }) {
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(() => {
    const n = new Map<string, number>();
    for (const s of speakers) for (const t of s.topics) n.set(t, (n.get(t) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [speakers]);
  const shown = speakers.filter(s => {
    if (topic && !s.topics.includes(topic)) return false;
    const needle = q.trim().toLowerCase();
    return !needle || [s.name, s.role, s.company, s.bio, ...s.topics, ...s.events.map(e => e.name)].some(v => v?.toLowerCase().includes(needle));
  });
  return (
    <div className="sp-portal">
      <div className="sp-tools">
        <label className="search sp-search"><span className="label">Search speakers</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, company, topic or event…" />
        </label>
        {topics.length > 0 && (
          <div className="sp-topics" role="group" aria-label="Filter by speciality">
            <button type="button" className="chip" aria-pressed={!topic} onClick={() => setTopic(null)}>All specialities</button>
            {topics.map(([t, n]) => (
              <button type="button" key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)}>{t} <span className="n">{n}</span></button>
            ))}
          </div>
        )}
      </div>
      <p className="muted sp-count" aria-live="polite">{shown.length} speaker{shown.length === 1 ? '' : 's'}{topic ? ` in ${topic}` : ''}</p>
      {shown.length
        ? <div className="speaker-grid">{shown.map(s => <SpeakerCard key={s.id} s={s} example={example}>{extras?.[s.id]}</SpeakerCard>)}</div>
        : <div className="empty-panel"><h2>No speakers match</h2><p>Try another speciality or clear the search.</p></div>}
    </div>
  );
}
