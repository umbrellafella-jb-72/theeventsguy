'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EventItem, Taxonomy } from '@/lib/data';
import { EventCard } from './EventCard';

type Summary = { key: string; label: string; count: number; confirmed: number; free: number; europe: number; awards: number; formats: [string, number][] };
type GroupKey = 'area' | 'format' | 'topics' | 'region' | 'priceTag' | 'status';

const GROUPS: { key: GroupKey; title: string; tax: keyof Taxonomy }[] = [
  { key: 'area', title: 'Area', tax: 'areas' },
  { key: 'format', title: 'Format', tax: 'formats' },
  { key: 'topics', title: 'Topic', tax: 'topics' },
  { key: 'region', title: 'Region or country', tax: 'regions' },
  { key: 'priceTag', title: 'Price', tax: 'prices' },
  { key: 'status', title: 'Date status', tax: 'statuses' },
];

const emptySel = (): Record<GroupKey, Set<string>> => ({ area: new Set(), format: new Set(), topics: new Set(), region: new Set(), priceTag: new Set(), status: new Set() });

function inMonth(e: EventItem, key: string) { return key === 'tbc' ? e.months.length === 0 : e.months.includes(key); }

export default function Guide(props: {
  events: EventItem[]; // only what this visitor may see
  summaries: Summary[];
  taxonomy: Taxonomy;
  paid: boolean;
  previewMonth: string;
  initialMonth: string;
  today: string; // YYYY-MM-DD
  paymentsReady: boolean;
  priceLabel: string;
}) {
  const { events, summaries, taxonomy, paid, previewMonth, today } = props;
  const [month, setMonth] = useState(props.initialMonth);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(emptySel);
  const [hidePast, setHidePast] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [month]);

  const locked = !paid && month !== previewMonth;
  const isPast = (e: EventItem) => e.months.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.sortKey) && e.months.length === 1 && e.sortKey < today;

  // Every filter except `skip`, so chip counts show what you'd get by adding that chip.
  const matches = (e: EventItem, skip?: GroupKey) => {
    if (month !== 'all' && !inMonth(e, month)) return false;
    if (hidePast && isPast(e)) return false;
    if (q) {
      const hay = `${e.name} ${e.city} ${e.region} ${e.venue ?? ''} ${e.organiser ?? ''} ${e.type ?? ''} ${e.categories ?? ''} ${e.topics.join(' ')}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
    }
    for (const g of GROUPS) {
      if (g.key === skip || sel[g.key].size === 0) continue;
      const v = e[g.key];
      if (Array.isArray(v) ? !v.some(t => sel[g.key].has(t)) : !sel[g.key].has(v)) return false;
    }
    return true;
  };

  const results = useMemo(() => events.filter(e => matches(e)), [events, month, q, sel, hidePast]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const out = {} as Record<GroupKey, Record<string, number>>;
    for (const g of GROUPS) {
      const c: Record<string, number> = {};
      for (const e of events) {
        if (!matches(e, g.key)) continue;
        const v = e[g.key];
        for (const t of Array.isArray(v) ? v : [v]) c[t] = (c[t] || 0) + 1;
      }
      out[g.key] = c;
    }
    return out;
  }, [events, month, q, sel, hidePast]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (g: GroupKey, v: string) => setSel(prev => {
    const next = { ...prev, [g]: new Set(prev[g]) };
    next[g].has(v) ? next[g].delete(v) : next[g].add(v);
    return next;
  });
  const active = GROUPS.flatMap(g => [...sel[g.key]].map(v => ({ g: g.key, v })));
  const clearAll = () => { setSel(emptySel()); setQ(''); };

  const monthOrder = summaries.map(s => s.key);
  const grouped = month === 'all'
    ? monthOrder.map(k => ({ key: k, label: summaries.find(s => s.key === k)!.label, items: results.filter(e => inMonth(e, k)) })).filter(g => g.items.length)
    : [{ key: month, label: summaries.find(s => s.key === month)?.label ?? '', items: results }];
  const totalShown = month === 'all' ? new Set(results.map(e => e.id)).size : results.length;
  const summary = summaries.find(s => s.key === month);

  return (
    <>
      <div className="month-strip">
        <div className="wrap" role="toolbar" aria-label="Choose a month" ref={strip}>
          {paid && <button className="mpill" aria-pressed={month === 'all'} onClick={() => setMonth('all')}>All months</button>}
          {summaries.map(s => {
            const isLocked = !paid && s.key !== previewMonth;
            return (
              <button key={s.key} className={`mpill${isLocked ? ' is-locked' : ''}`} aria-pressed={month === s.key} onClick={() => setMonth(s.key)}>
                {s.key === 'tbc' ? 'Dates TBC' : s.label.replace(/ 20(\d\d)$/, ' ’$1')}
                <span className="n">{s.count}</span>
                {isLocked && <span className="sr-only">(subscribers only)</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`wrap layout${locked ? ' no-filters' : ''}`}>
        {!locked && <aside className={`filters${showFilters ? '' : ' collapsed'}`} aria-label="Filters">
          <div className="search">
            <label htmlFor="q">Search</label>
            <input id="q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Event, organiser, city, country…" />
          </div>
          <button className="btn btn-secondary btn-sm filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}>
            {showFilters ? 'Hide filters' : `Filter by tag${active.length ? ` (${active.length})` : ''}`}
          </button>
          <label className="toggle"><input type="checkbox" checked={hidePast} onChange={e => setHidePast(e.target.checked)} /> Hide events that have passed</label>
          {GROUPS.map(g => {
            const values = taxonomy[g.tax].filter(v => (counts[g.key][v] || 0) > 0 || sel[g.key].has(v));
            return (
              <details key={g.key} className="fgroup" open={g.key !== 'status'}>
                <summary><h3>{g.title}</h3>{sel[g.key].size > 0 && <span className="badge badge-glen">{sel[g.key].size}</span>}</summary>
                <div className="chips">
                  {values.length === 0 && <span className="muted" style={{ fontSize: 14 }}>Nothing here for this view</span>}
                  {values.map(v => (
                    <button key={v} className="chip" aria-pressed={sel[g.key].has(v)} onClick={() => toggle(g.key, v)}>
                      {v}<span className="n">{counts[g.key][v] || 0}</span>
                    </button>
                  ))}
                </div>
              </details>
            );
          })}
        </aside>}

        <section aria-live="polite">
          {locked && summary ? (
            <div className="lock-panel">
              <h2>{summary.label}: {summary.count} events</h2>
              <p>{summary.confirmed} confirmed by the organiser, {summary.free} free to attend, {summary.europe} in Europe and {summary.awards} awards. Subscribe to see every event, filter by tag and add them to your calendar.</p>
              <div className="lock-formats">{summary.formats.map(([f, n]) => <span key={f} className="badge">{f} · {n}</span>)}</div>
              {props.paymentsReady
                ? <form action="/api/checkout" method="post"><button className="btn btn-primary" type="submit">Subscribe — {props.priceLabel}</button></form>
                : <p className="note">Payments aren’t switched on yet for this deployment.</p>}
              <p style={{ marginTop: 16, marginBottom: 0 }}><button className="btn btn-ghost btn-sm" onClick={() => setMonth(previewMonth)}>Back to the free month</button></p>
            </div>
          ) : (
            <>
              <div className="results-head">
                <strong>{totalShown} event{totalShown === 1 ? '' : 's'}{month !== 'all' && summary ? ` in ${summary.key === 'tbc' ? 'the dates-TBC list' : summary.label}` : ''}</strong>
                {(active.length > 0 || q) && (
                  <div className="active-filters">
                    {active.map(a => <button key={a.g + a.v} className="chip" aria-pressed="true" onClick={() => toggle(a.g, a.v)}>{a.v} ✕</button>)}
                    <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
                  </div>
                )}
              </div>
              {!paid && <p className="note" style={{ marginBottom: 16 }}>You’re viewing this month free. Subscribers get every month, all filters across the year and calendar downloads.</p>}
              {totalShown === 0 && <div className="empty">No events match these filters. <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear filters</button></div>}
              {grouped.map(g => (
                <div key={g.key} className="month-block">
                  {month === 'all' && <h2>{g.label}<span>{g.items.length} event{g.items.length === 1 ? '' : 's'}</span></h2>}
                  <div className="ev-list">
                    {g.items.map(e => <EventCard key={`${g.key}-${e.id}`} e={e} month={g.key} past={isPast(e)} />)}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}
