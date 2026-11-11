'use client';
import { RELEASE_DAYS, releaseLabel } from '@/lib/release';

import type { EventItem } from '@/lib/data';
import { BRAND, eventDates, googleUrl, office365Url, outlookUrl } from '@/lib/calendar';
import { setSaved, useShortlist } from '@/lib/shortlist-client';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk').replace(/\/$/, '');

/** Save and add to calendar. (Sharing was removed so listings can't be passed on outside the
 *  site; calendar entries carry "Brought to you by The Events Guy".) Visitors see the same buttons pointing to membership,
 *  except on events that are open to everyone (featured, or in the free month). */
export function EventActions({ e, paid, full, compact, canSave = paid }: { e: EventItem; paid: boolean; full: boolean; compact?: boolean; canSave?: boolean }) {
  const list = useShortlist(canSave);
  const isSaved = list.saved.has(e.id);
  const canCal = full && !e.locked && Boolean(eventDates(e));

  return (
    <div className={`ev-tools${compact ? ' is-compact' : ''}`}>
      {canSave
        ? <button className={`btn btn-sm ${isSaved ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={isSaved} onClick={() => setSaved(e.id, !isSaved)}>
            {isSaved ? '★ Saved' : '☆ Save'}<span className="sr-only"> {e.name}</span>
          </button>
        : <a className="btn btn-secondary btn-sm" href="/login?next=/guide" title="Save events with a free account">☆ Save<span className="sr-only"> — sign in to save</span></a>}

      {canCal ? (
        <details className="menu">
          <summary className="btn btn-secondary btn-sm">Add to calendar</summary>
          <div className="menu-list" role="menu">
            <p className="menu-brand">{BRAND}</p>
            <a role="menuitem" href={googleUrl(e, SITE)!} target="_blank" rel="noopener noreferrer">Google Calendar</a>
            <a role="menuitem" href={outlookUrl(e, SITE)!} target="_blank" rel="noopener noreferrer">Outlook.com</a>
            <a role="menuitem" href={office365Url(e, SITE)!} target="_blank" rel="noopener noreferrer">Outlook (Microsoft 365)</a>
            <a role="menuitem" href={`/api/ics/${e.id}`} download={`${e.id}.ics`}>Apple Calendar (.ics)</a>
            <a role="menuitem" href={`/api/ics/${e.id}`} download={`${e.id}.ics`}>Other (.ics file)</a>
          </div>
        </details>
      ) : paid && e.locked ? (
        <span className="btn btn-ghost btn-sm is-disabled" aria-disabled="true" title={`Full details and calendar links are released ${RELEASE_DAYS} days ahead`}>{e.opensOn ? `Calendar from ${releaseLabel(e.opensOn)}` : 'Calendar once dated'}</span>
      ) : !full || e.locked ? (
        <a className="btn btn-secondary btn-sm" href="/#pricing" title="Members can add any event to Google, Outlook or Apple Calendar">Add to calendar<span className="sr-only"> — members only</span></a>
      ) : (
        <span className="btn btn-ghost btn-sm is-disabled" aria-disabled="true" title="The date isn’t fixed yet">Date TBC</span>
      )}

    </div>
  );
}
