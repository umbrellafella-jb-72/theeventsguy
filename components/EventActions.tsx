'use client';

import { useState } from 'react';
import type { EventItem } from '@/lib/data';
import { eventDates, googleUrl, office365Url, outlookUrl, shareText } from '@/lib/calendar';
import { setSaved, useShortlist } from '@/lib/shortlist-client';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk').replace(/\/$/, '');

/** Save, add to calendar and share. Visitors see the same buttons pointing to membership,
 *  except on events that are open to everyone (featured, or in the free month). */
export function EventActions({ e, paid, full, compact, canSave = paid }: { e: EventItem; paid: boolean; full: boolean; compact?: boolean; canSave?: boolean }) {
  const list = useShortlist(canSave);
  const [note, setNote] = useState('');
  const isSaved = list.saved.has(e.id);
  const canCal = full && !e.locked && Boolean(eventDates(e));
  const page = `${SITE}/events/${e.id}`;
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(''), 2200); };

  const copy = async (text: string, done: string) => {
    try { await navigator.clipboard.writeText(text); flash(done); } catch { flash('Couldn’t copy — select the address bar instead'); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: e.name, text: `${e.name} — ${e.dates}, ${e.city}`, url: page }); } catch { /* cancelled */ } }
    else copy(page, 'Link copied');
  };

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
            <a role="menuitem" href={googleUrl(e, SITE)!} target="_blank" rel="noopener noreferrer">Google Calendar</a>
            <a role="menuitem" href={outlookUrl(e, SITE)!} target="_blank" rel="noopener noreferrer">Outlook.com</a>
            <a role="menuitem" href={office365Url(e, SITE)!} target="_blank" rel="noopener noreferrer">Outlook (Microsoft 365)</a>
            <a role="menuitem" href={`/api/ics/${e.id}`} download={`${e.id}.ics`}>Apple Calendar (.ics)</a>
            <a role="menuitem" href={`/api/ics/${e.id}`} download={`${e.id}.ics`}>Other (.ics file)</a>
          </div>
        </details>
      ) : !full || e.locked ? (
        <a className="btn btn-secondary btn-sm" href="/#pricing" title="Members can add any event to Google, Outlook or Apple Calendar">Add to calendar<span className="sr-only"> — members only</span></a>
      ) : (
        <span className="btn btn-ghost btn-sm is-disabled" aria-disabled="true" title="The date isn’t fixed yet">Date TBC</span>
      )}

      <details className="menu">
        <summary className="btn btn-ghost btn-sm">Share</summary>
        <div className="menu-list" role="menu">
          <button role="menuitem" onClick={share}>Share…</button>
          <button role="menuitem" onClick={() => copy(page, 'Link copied')}>Copy link</button>
          {!e.locked && <button role="menuitem" onClick={() => copy(shareText(e, SITE), 'Details copied')}>Copy details</button>}
          <a role="menuitem" href={`mailto:?subject=${encodeURIComponent(e.name)}&body=${encodeURIComponent(shareText(e, SITE))}`}>Email</a>
          <a role="menuitem" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(page)}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a role="menuitem" href={`https://wa.me/?text=${encodeURIComponent(`${e.name} ${page}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </details>
      <span className="ev-note" role="status" aria-live="polite">{note}</span>
    </div>
  );
}
