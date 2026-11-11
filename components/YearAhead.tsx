'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type MonthTile = { key: string; label: string; count: number; confirmed: number; free: number };
type QuarterTile = MonthTile & { span: string; months: string[]; from: string; to: string };
const isQuarter = (t: MonthTile | QuarterTile): t is QuarterTile => 'months' in t;

/** "The year ahead": month cards or quarter cards, with a toggle. Counts only — no event details. */
export function YearAhead({ months, quarters, cur, paid }: { months: MonthTile[]; quarters: QuarterTile[]; cur: string; paid: boolean }) {
  const [view, setView] = useState<'month' | 'quarter'>('month');
  useEffect(() => { try { if (localStorage.getItem('eg_year_view') === 'quarter') setView('quarter'); } catch { /* storage blocked */ } }, []);
  const pick = (v: 'month' | 'quarter') => { setView(v); try { localStorage.setItem('eg_year_view', v); } catch { /* storage blocked */ } };
  const tiles: (MonthTile | QuarterTile)[] = view === 'month' ? months : quarters;
  const max = Math.max(1, ...tiles.map(t => t.count));
  const isCur = (t: MonthTile | QuarterTile) => (isQuarter(t) ? t.months.includes(cur) : t.key === cur);

  return (
    <>
      <div className="seg year-toggle" role="group" aria-label="Show the year by">
        <button type="button" className="seg-link" aria-pressed={view === 'month'} onClick={() => pick('month')}>Month</button>
        <button type="button" className="seg-link" aria-pressed={view === 'quarter'} onClick={() => pick('quarter')}>Quarter</button>
      </div>
      <div className={`months-grid${view === 'quarter' ? ' is-quarters' : ''}`}>
        {tiles.map(t => {
          const current = isCur(t);
          const href = isQuarter(t) ? `/guide?month=all&from=${t.from}&to=${t.to}` : `/guide?month=${t.key}`;
          return (
            <Link key={t.key} href={href} className={`month-tile${current ? ' is-current' : ''}`} aria-current={current ? 'date' : undefined}>
              {current && <span className="now-tag">{view === 'month' ? 'This month' : 'This quarter'}</span>}
              <h3>{t.key === 'tbc' ? 'Dates TBC' : t.label}</h3>
              {isQuarter(t) && <span className="muted tile-span">{t.span}</span>}
              <div className="count">{t.count}</div>
              <div className="bar" aria-hidden="true"><i style={{ width: `${(t.count / max) * 100}%` }} /></div>
              <span className="muted tile-sub">{t.confirmed} confirmed · {t.free} free</span>
              {!paid && !(view === 'month' && t.key === cur) && <span className="locked">{current ? 'This month free' : 'Subscribers'}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );
}
