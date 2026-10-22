'use client';

import { useMemo, useState } from 'react';
import type { MediaItem } from '@/lib/data';

export default function MediaDirectory({ items, total, types, paid, paymentsReady, priceLabel }: {
  items: MediaItem[]; total: number; types: string[]; paid: boolean; paymentsReady: boolean; priceLabel: string;
}) {
  const [type, setType] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const topics = useMemo(() => {
    const c: Record<string, number> = {};
    items.filter(m => !type || m.mediaType === type).forEach(m => m.topics.forEach(t => (c[t] = (c[t] || 0) + 1)));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [items, type]);
  const shown = items.filter(m => (!type || m.mediaType === type) && (!topic || m.topics.includes(topic)));
  const hidden = total - items.length;

  return (
    <>
      {paid && (
        <div className="media-filters" role="toolbar" aria-label="Filter">
          <button className="chip" aria-pressed={!type} onClick={() => setType(null)}>All<span className="n">{items.length}</span></button>
          {types.map(t => {
            const n = items.filter(m => m.mediaType === t).length;
            return n ? <button key={t} className="chip" aria-pressed={type === t} onClick={() => setType(type === t ? null : t)}>{t}<span className="n">{n}</span></button> : null;
          })}
          <span style={{ width: 16 }} />
          {topics.slice(0, 10).map(([t, n]) => (
            <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)}>{t}<span className="n">{n}</span></button>
          ))}
        </div>
      )}
      <div className="media-grid">
        {shown.map(m => (
          <article key={m.id} className="media">
            <div className="ev-badges" style={{ marginTop: 0 }}>
              <span className="badge badge-glen">{m.mediaType}</span>
              {m.based && <span className="badge">{m.based}</span>}
            </div>
            <h3>{m.name}</h3>
            {(m.hosts || m.organisation) && <p className="muted">{[m.hosts, m.organisation].filter(Boolean).join(' · ')}</p>}
            {m.focus && <p>{m.focus}</p>}
            {m.frequency && <p className="muted">{m.frequency}</p>}
            {m.topics.length > 0 && <div className="ev-topics">{m.topics.map(t => <span key={t}>{t}</span>)}</div>}
            <div className="actions">
              {m.url ? <a className="btn btn-secondary btn-sm" href={m.url} target="_blank" rel="noopener noreferrer">Listen or sign up<span className="sr-only"> — {m.name}</span></a>
                : m.whereText && <span className="muted" style={{ fontSize: 14 }}>Find it on {m.whereText}</span>}
            </div>
          </article>
        ))}
        {!paid && Array.from({ length: Math.min(hidden, 3) }, (_, i) => (
          <article key={i} className="media is-locked" aria-hidden="true">
            <div className="ev-badges" style={{ marginTop: 0 }}><span className="badge badge-glen">Podcast</span></div>
            <h3>Subscriber listing</h3><p>Hosts and focus for this show are visible to subscribers.</p>
          </article>
        ))}
      </div>
      {!paid && hidden > 0 && (
        <div className="lock-panel" style={{ marginTop: 24 }}>
          <h2>{hidden} more webinars & podcasts</h2>
          <p>Subscribers get the full directory, filtered by type and topic, alongside every month of events.</p>
          {paymentsReady
            ? <form action="/api/checkout" method="post"><button className="btn btn-primary" type="submit">Subscribe — {priceLabel}</button></form>
            : <p className="note">Payments aren’t switched on yet for this deployment.</p>}
        </div>
      )}
    </>
  );
}
