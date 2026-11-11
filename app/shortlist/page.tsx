import Link from 'next/link';
import { getAccess, longToken } from '@/lib/access';
import { eventsFor } from '@/lib/data';
import { sessionUser, isMember } from '@/lib/users';
import { siteUrl } from '@/lib/stripe';
import { ShortlistView } from '@/components/ShortlistView';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My events — The Events Guy' };

export default async function ShortlistPage() {
  const a = await getAccess();
  const u = await sessionUser();
  const feed = u && (isMember(u) || a.paid) ? `${siteUrl()}/api/calendar/${longToken(u.id, 'feed')}` : null;
  const canSave = Boolean(u) || a.paid;
  return (
    <div className="wrap section">
      <h1 className="page-title">My events</h1>
      <p className="muted" style={{ maxWidth: '60ch' }}>Your shortlist for the year. Add it all to your calendar in one go, or subscribe so new saves appear automatically.</p>
      {canSave
        ? <ShortlistView events={eventsFor(a.paid)} feedUrl={feed} paid={a.paid} />
        : <div className="lock-panel"><h2>Save events to your own shortlist</h2><p>A free account lets you save events and searches. Members can also sync the list to Google, Outlook or Apple Calendar and get reminders.</p><Link className="btn btn-primary" href="/login?next=/shortlist">Sign in or create a free account</Link></div>}
    </div>
  );
}
