'use client';
import { RELEASE_DAYS } from '@/lib/release';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EventItem, Taxonomy } from '@/lib/data';
import { EventCard } from './EventCard';
import { saveSearch } from '@/app/portal/actions';
import type { SpeakerRef } from '@/lib/data';

type Summary = { key: string; label: string; count: number; confirmed: number; free: number; europe: number; awards: number; formats: [string, number][] };
type GroupKey = 'area' | 'format' | 'sectors' | 'topics' | 'region' | 'priceTag' | 'status';

// membersOnly: filters on details that teasers don't carry, so visitors don't see them.
const GROUPS: { key: GroupKey; title: string; tax: keyof Taxonomy; membersOnly?: boolean }[] = [
  { key: 'area', title: 'Area', tax: 'areas' },
  { key: 'format', title: 'Category', tax: 'formats' },
  { key: 'sectors', title: 'Industry', tax: 'sectors' },
  { key: 'topics', title: 'Topic', tax: 'topics', membersOnly: true },
  { key: 'region', title: 'Region or country', tax: 'regions' },
  { key: 'priceTag', title: 'Price', tax: 'prices', membersOnly: true },
  { key: 'status', title: 'Date status', tax: 'statuses' },
];

const emptySel = (): Record<GroupKey, Set<string>> => ({ area: new Set(), format: new Set(), sectors: new Set(), topics: new Set(), region: new Set(), priceTag: new Set(), status: new Set() });

function inMonth(e: EventItem, key: string) { return key === 'tbc' ? e.months.length === 0 : e.months.includes(key); }

export default function Guide(props: {
  events: EventItem[]; // as this visitor may see them: whole, or teasers (locked)
  summaries: Summary[];
  taxonomy: Taxonomy;
  paid: boolean;
  previewMonth: string;
  initialMonth: string;
  today: string; // YYYY-MM-DD
  paymentsReady: boolean;
  priceLabel: string;
  speakers?: Record<string, SpeakerRef[]>;
  canSave?: boolean;      // signed in (free account) or member
  visitorLocked?: boolean; // not signed in: only the current month (and featured events) until they register
  signedIn?: boolean;     // can save searches
  initial?: { q?: string; from?: string; to?: string; past?: boolean; sel?: Partial<Record<string, string[]>> };
}) {
  const { events, summaries, taxonomy, paid, previewMonth, today } = props;
  const [month, setMonth] = useState(props.initialMonth);
  const init = props.initial ?? {};
  const [q, setQ] = useState(init.q ?? '');
  const [sel, setSel] = useState(() => { const s = emptySel(); for (const g of GROUPS) for (const v of init.sel?.[g.key] ?? []) s[g.key].add(v); return s; });
  const [hidePast, setHidePast] = useState(init.past === undefined ? true : !init.past);
  const [from, setFrom] = useState(init.from ?? '');
  const [to, setTo] = useState(init.to ?? '');
  const [naming, setNaming] = useState(false);
  const groups = GROUPS.filter(g => paid || !g.membersOnly);
  const [showFilters, setShowFilters] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [month]);

  const isPast = (e: EventItem) => e.months.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.sortKey) && e.months.length === 1 && e.sortKey < today;

  // Every filter except `skip`, so chip counts show what you'd get by adding that chip.
  const matches = (e: EventItem, skip?: GroupKey) => {
    if (month !== 'all' && !inMonth(e, month)) return false;
    if (hidePast && isPast(e)) return false;
    if (from || to) {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(e.sortKey) ? e.sortKey : null;
      if (!day || (from && day < from) || (to && day > to)) return false;
    }
    if (q) {
      const hay = `${e.name} ${e.city} ${e.region} ${e.venue ?? ''} ${e.organiser ?? ''} ${e.type ?? ''} ${e.categories ?? ''} ${e.topics.join(' ')} ${e.sectors.join(' ')} ${e.description ?? ''} ${(e.sponsors ?? []).join(' ')}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
    }
    for (const g of groups) {
      if (g.key === skip || sel[g.key].size === 0) continue;
      const v = e[g.key];
      if (Array.isArray(v) ? !v.some(t => sel[g.key].has(t)) : !sel[g.key].has(v)) return false;
    }
    return true;
  };

  const results = useMemo(() => events.filter(e => matches(e)).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))), [events, month, q, sel, hidePast, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const out = {} as Record<GroupKey, Record<string, number>>;
    for (const g of groups) {
      const c: Record<string, number> = {};
      for (const e of events) {
        if (!matches(e, g.key)) continue;
        const v = e[g.key];
        for (const t of Array.isArray(v) ? v : [v]) c[t] = (c[t] || 0) + 1;
      }
      out[g.key] = c;
    }
    return out;
  }, [events, month, q, sel, hidePast, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (g: GroupKey, v: string) => setSel(prev => {
    const next = { ...prev, [g]: new Set(prev[g]) };
    next[g].has(v) ? next[g].delete(v) : next[g].add(v);
    return next;
  });
  const active = groups.flatMap(g => [...sel[g.key]].map(v => ({ g: g.key, v })));
  const clearAll = () => { setSel(emptySel()); setQ(''); setFrom(''); setTo(''); };
  // The current search as a query string, for saved searches and shareable links.
  const query = (() => {
    const p = new URLSearchParams();
    if (month !== (paid ? 'all' : previewMonth)) p.set('month', month);
    if (q) p.set('q', q); if (from) p.set('from', from); if (to) p.set('to', to); if (!hidePast) p.set('past', '1');
    for (const g of groups) if (sel[g.key].size) p.set(`f_${g.key}`, [...sel[g.key]].join('|'));
    return p.toString();
  })();
  useEffect(() => { try { history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`); } catch { /* ignore */ } }, [query]);

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
          {!props.visitorLocked && <button className="mpill" aria-pressed={month === 'all'} onClick={() => setMonth('all')}>All months</button>}
          {summaries.map(s => {
            const lockedPill = props.visitorLocked && s.key !== previewMonth;
            return (
              <button key={s.key} className={`mpill${lockedPill ? ' is-locked' : ''}`} aria-pressed={month === s.key} onClick={() => setMonth(s.key)}>
                {s.key === 'tbc' ? 'Dates TBC' : s.label.replace(/ 20(\d\d)$/, ' ’$1')}
                <span className="n">{s.count}</span>
                {lockedPill && <span className="sr-only"> (register free to see)</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="wrap layout">
        <aside className={`filters${showFilters ? '' : ' collapsed'}`} aria-label="Filters">
          <div className="search">
            <label htmlFor="q">Search</label>
            <input id="q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Event, organiser, city, country…" />
          </div>
          <button className="btn btn-secondary btn-sm filter-toggle" aria-expanded={showFilters} onClick={() => setShowFilters(v => !v)}>
            {showFilters ? 'Hide filters' : `Filter by tag${active.length ? ` (${active.length})` : ''}`}
          </button>
          <label className="toggle"><input type="checkbox" checked={hidePast} onChange={e => setHidePast(e.target.checked)} /> Hide events that have passed</label>
          <fieldset className="date-range">
            <legend>Dates</legend>
            <label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label>To<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
          </fieldset>
          {groups.map(g => {
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
          {!paid && <p className="muted filters-note">Members can also filter by topic and price.</p>}
        </aside>

        <section aria-live="polite">
          {(
            <>
              <div className="results-head">
                {props.visitorLocked && month !== previewMonth
                  ? <strong>{summary?.key === 'tbc' ? 'Dates TBC' : summary?.label}</strong>
                  : <strong>{totalShown} event{totalShown === 1 ? '' : 's'}{month !== 'all' && summary ? ` in ${summary.key === 'tbc' ? 'the dates-TBC list' : summary.label}` : ''}</strong>}
                {props.visitorLocked && month !== previewMonth ? null : props.signedIn ? (
                  naming ? (
                    <form action={saveSearch} className="save-search">
                      <input type="hidden" name="query" value={query} />
                      <input name="name" aria-label="Name this search" placeholder="Name this search" maxLength={80} autoFocus required />
                      <button className="btn btn-primary btn-sm" type="submit">Save</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setNaming(false)}>Cancel</button>
                    </form>
                  ) : <button className="btn btn-secondary btn-sm" onClick={() => setNaming(true)}>Save this search</button>
                ) : <a className="btn btn-ghost btn-sm" href={`/login?next=${encodeURIComponent(`/guide?${query}`)}`}>Sign in to save this search</a>}
                {(active.length > 0 || q || from || to) && (
                  <div className="active-filters">
                    {(from || to) && <button className="chip" aria-pressed="true" onClick={() => { setFrom(''); setTo(''); }}>{from || '…'} → {to || '…'} ✕</button>}
                    {active.map(a => <button key={a.g + a.v} className="chip" aria-pressed="true" onClick={() => toggle(a.g, a.v)}>{a.v} ✕</button>)}
                    <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
                  </div>
                )}
              </div>
              {props.visitorLocked ? (
                <div className="note member-note">
                  <span>You’re seeing <b>{summaries.find(x => x.key === previewMonth)?.label ?? 'this month'}</b>. <b>Register free</b> to see what’s on in every month, save events and searches, and set up a speaker, sponsor or organiser profile.</span>
                  <a className="btn btn-primary btn-sm" href={`/login?next=${encodeURIComponent('/guide')}`}>Register free</a>
                </div>
              ) : !paid && (
                <div className="note member-note">
                  <span>Everyone can see what’s on and where. <b>{summaries.find(x => x.key === previewMonth)?.label ?? 'This month'}</b> and featured events are open in full; members get every event’s venue, price, booking link and speakers, plus a saved shortlist, calendar sync and reminders.</span>
                  <a className="btn btn-primary btn-sm" href="/#pricing">See membership plans</a>
                </div>
              )}
              {paid && (
                <p className="note member-note"><span>Full details are released {RELEASE_DAYS} days before each event (for awards, before the entry deadline or ceremony). Later events show the day they open — save them now and they fill in on your shortlist and calendar feed.</span></p>
              )}
              {props.visitorLocked && month !== previewMonth ? (
                <div className="lock-panel register-panel">
                  <h2>{month === 'all' ? 'Every month' : summary?.key === 'tbc' ? 'Events with dates to be confirmed' : summary?.label} — free with an account</h2>
                  <p>{summary ? `${summary.count} event${summary.count === 1 ? '' : 's'} listed. ` : ''}Create a free account to see what’s on in every month: names, dates, cities and organisers. It takes one email — no password, no card.</p>
                  <ul className="ticks">
                    <li>Browse the whole year ahead</li>
                    <li>Save events to your shortlist and save searches</li>
                    <li>Publish a speaker, sponsor or organiser profile</li>
                  </ul>
                  <a className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/guide?month=${month}`)}`}>Register free</a>
                  <button className="btn btn-ghost" onClick={() => setMonth(previewMonth)}>Back to {summaries.find(x => x.key === previewMonth)?.label ?? 'this month'}</button>
                </div>
              ) : <>
              {totalShown === 0 && <div className="empty">No events match these filters. <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear filters</button></div>}
              {grouped.map(g => (
                <div key={g.key} className="month-block">
                  {month === 'all' && <h2>{g.label}<span>{g.items.length} event{g.items.length === 1 ? '' : 's'}</span></h2>}
                  <div className="ev-list">
                    {g.items.map(e => <EventCard key={`${g.key}-${e.id}`} e={e} month={g.key} past={isPast(e)} speakers={props.speakers?.[e.id]} paid={paid} canSave={props.canSave ?? paid} />)}
                  </div>
                </div>
              ))}
              </>}
            </>
          )}
        </section>
      </div>
    </>
  );
}
