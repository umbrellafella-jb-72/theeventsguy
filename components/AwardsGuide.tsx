'use client';

import { useMemo, useState } from 'react';
import { ENTRY_FILTERS, ENTRY_ORDER } from '@/lib/awards';
import { AwardCard, type AwardView } from './AwardCard';

type Sort = 'deadline' | 'ceremony';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = (a: AwardView) => a.months[0] ?? 'tbc';
const monthName = (k: string) => (k === 'tbc' ? 'Ceremony date to be confirmed' : `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`);

export default function AwardsGuide({ awards, areas, topics }: { awards: AwardView[]; areas: string[]; topics: string[] }) {
  const [q, setQ] = useState('');
  const [entry, setEntry] = useState<Set<string>>(new Set());
  const [area, setArea] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>('deadline');

  const flip = (set: Set<string>, put: (s: Set<string>) => void, v: string) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); put(n); };
  const match = (a: AwardView, skip?: string) => {
    if (q) {
      const hay = `${a.name} ${a.organiser ?? ''} ${a.city} ${a.categories ?? ''} ${a.topics.join(' ')} ${a.judgeList.map(j => j.name).join(' ')}`.toLowerCase();
      if (!q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
    }
    if (skip !== 'entry' && entry.size && !entry.has(a.entry.state)) return false;
    if (skip !== 'area' && area.size && !area.has(a.area)) return false;
    if (skip !== 'topic' && topic.size && !a.topics.some(t => topic.has(t))) return false;
    return true;
  };
  const count = (skip: string, test: (a: AwardView) => boolean) => awards.filter(a => match(a, skip) && test(a)).length;

  const results = useMemo(() => {
    const list = awards.filter(a => match(a));
    return sort === 'deadline'
      ? list.sort((x, y) => ENTRY_ORDER[x.entry.state] - ENTRY_ORDER[y.entry.state] || (x.entry.next ?? '').localeCompare(y.entry.next ?? '') || x.sortKey.localeCompare(y.sortKey))
      : list.sort((x, y) => (x.sortKey || '9999').localeCompare(y.sortKey || '9999'));
  }, [awards, q, entry, area, topic, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = sort === 'ceremony'
    ? [...new Set(results.map(monthOf))].map(k => ({ key: k, label: monthName(k), items: results.filter(a => monthOf(a) === k) }))
    : [{ key: 'all', label: '', items: results }];
  const clear = () => { setQ(''); setEntry(new Set()); setArea(new Set()); setTopic(new Set()); };
  const anyFilter = q || entry.size || area.size || topic.size;

  return (
    <div className="layout">
      <aside className="filters aw-filters" aria-label="Filter awards">
        <div className="search">
          <label htmlFor="aq">Search</label>
          <input id="aq" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Award, organiser, category, judge…" />
        </div>
        <div className="fgroup-static">
          <h3>Entries</h3>
          <div className="chips">{ENTRY_FILTERS.map(f => (
            <button key={f.key} className="chip" aria-pressed={entry.has(f.key)} onClick={() => flip(entry, setEntry, f.key)}>
              {f.label}<span className="n">{count('entry', a => a.entry.state === f.key)}</span>
            </button>
          ))}</div>
        </div>
        <div className="fgroup-static">
          <h3>Area</h3>
          <div className="chips">{areas.map(v => (
            <button key={v} className="chip" aria-pressed={area.has(v)} onClick={() => flip(area, setArea, v)}>{v}<span className="n">{count('area', a => a.area === v)}</span></button>
          ))}</div>
        </div>
        <details className="fgroup">
          <summary><h3>Topic</h3>{topic.size > 0 && <span className="badge badge-glen">{topic.size}</span>}</summary>
          <div className="chips">{topics.map(v => (
            <button key={v} className="chip" aria-pressed={topic.has(v)} onClick={() => flip(topic, setTopic, v)}>{v}<span className="n">{count('topic', a => a.topics.includes(v))}</span></button>
          ))}</div>
        </details>
      </aside>

      <section aria-live="polite">
        <div className="results-head">
          <strong>{results.length} award{results.length === 1 ? '' : 's'}</strong>
          <div className="seg" role="group" aria-label="Sort awards">
            <button aria-pressed={sort === 'deadline'} onClick={() => setSort('deadline')}>Next deadline</button>
            <button aria-pressed={sort === 'ceremony'} onClick={() => setSort('ceremony')}>Ceremony date</button>
          </div>
          {anyFilter ? <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button> : null}
        </div>
        {results.length === 0 && <div className="empty">No awards match these filters. <button className="btn btn-ghost btn-sm" onClick={clear}>Clear filters</button></div>}
        {groups.map(g => (
          <div key={g.key} className="month-block">
            {g.label && <h2>{g.label}<span>{g.items.length} award{g.items.length === 1 ? '' : 's'}</span></h2>}
            <div className="ev-list">{g.items.map(a => <AwardCard key={a.id} a={a} />)}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
