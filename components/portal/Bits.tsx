import { reportContent } from '@/app/portal/actions';
import { events, eventLabel, todayKey } from '@/lib/data';
import type { Status } from '@/lib/portal';

export function StatusBadge({ status }: { status: Status }) {
  const t = { pending: ['badge-torc', 'Waiting for approval'], published: ['badge-glen', 'Live'], hidden: ['', 'Hidden by an admin'] }[status];
  return <span className={`badge ${t[0]}`}>{t[1]}</span>;
}

/** "Report this" — anyone can flag a profile or opportunity for an admin to review. */
export function ReportButton({ type, id, label, back }: { type: 'speaker' | 'sponsor' | 'opportunity'; id: string; label: string; back: string }) {
  return (
    <details className="report">
      <summary>Report</summary>
      <form action={reportContent}>
        <input type="hidden" name="type" value={type} /><input type="hidden" name="id" value={id} />
        <input type="hidden" name="label" value={label} /><input type="hidden" name="back" value={back} />
        <label>What’s wrong?<textarea name="reason" rows={2} required maxLength={1000} /></label>
        <button className="btn btn-secondary btn-sm" type="submit">Send to the admins</button>
      </form>
    </details>
  );
}

/** Upcoming events for the type-ahead pickers. */
export function EventOptions({ id }: { id: string }) {
  const today = todayKey();
  const list = events.filter(e => !e.sortKey || e.sortKey >= today.slice(0, 7)).slice(0, 900);
  return <datalist id={id}>{list.map(e => <option key={e.id} value={eventLabel(e)} />)}</datalist>;
}

export const SECTOR_OPTIONS = ['Retail', 'Fashion & beauty', 'Food, drink & hospitality', 'Travel, leisure & gaming', 'B2B & wholesale', 'Financial services', 'Brands & DTC', 'Cross-sector'];
export function SectorChecks({ name, selected }: { name: string; selected: string[] }) {
  return <div className="check-grid">{SECTOR_OPTIONS.map(s => <label key={s} className="check"><input type="checkbox" name={name} value={s} defaultChecked={selected.includes(s)} /> {s}</label>)}</div>;
}
