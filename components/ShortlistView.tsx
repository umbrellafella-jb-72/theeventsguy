'use client';

import type { EventItem } from '@/lib/data';
import { icsCalendar } from '@/lib/calendar';
import { useShortlist } from '@/lib/shortlist-client';
import { EventCard } from './EventCard';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk').replace(/\/$/, '');

export function ShortlistView({ events, feedUrl, paid }: { events: EventItem[]; feedUrl: string | null; paid: boolean }) {
  const list = useShortlist(true);
  const saved = events.filter(e => list.saved.has(e.id)).sort((a, b) => (a.sortKey || '9').localeCompare(b.sortKey || '9'));
  const download = () => {
    const blob = new Blob([icsCalendar(saved, SITE, 'My events — The Events Guy')], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-events.ics'; a.click(); URL.revokeObjectURL(a.href);
  };
  if (!list.ready) return <p className="muted">Loading your events…</p>;
  return (
    <>
      <div className="shortlist-tools">
        <strong>{saved.length} saved event{saved.length === 1 ? '' : 's'}</strong>
        {saved.length > 0 && paid && <button className="btn btn-secondary btn-sm" onClick={download}>Download all (.ics)</button>}
        {feedUrl && <a className="btn btn-secondary btn-sm" href={feedUrl.replace(/^https?:/, 'webcal:')}>Subscribe in my calendar</a>}
      </div>
      {list.mode === 'local' && <p className="note">Your shortlist is saved in this browser. Once accounts are switched on it follows you to every device and powers reminders.</p>}
      {!paid && saved.length > 0 && <p className="note">Members can add the whole list to their calendar and get reminders before each event. <a href="/#pricing">See membership</a></p>}
      {saved.length === 0
        ? <div className="empty">Nothing saved yet. Tap <b>☆ Save</b> on any event in <a href="/guide">the guide</a> to build your year.</div>
        : <div className="ev-list">{saved.map(e => <EventCard key={e.id} e={e} month={null} paid={paid} canSave />)}</div>}
    </>
  );
}
