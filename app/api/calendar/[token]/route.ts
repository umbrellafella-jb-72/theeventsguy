import { verify } from '@/lib/access';
import { eventById, type EventItem } from '@/lib/data';
import { icsCalendar } from '@/lib/calendar';
import { storeReady } from '@/lib/store';
import { getUser, isMember } from '@/lib/users';
import { refreshMembership } from '@/lib/membership';
import { siteUrl } from '@/lib/stripe';

// A member's shortlist as a calendar subscription (Google, Outlook, Apple poll it every few hours).
// Calendar sync is a membership feature: if the membership lapses, the feed empties.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const tok = verify((await params).token.replace(/\.ics$/, ''), 'feed');
  if (!tok || !storeReady()) return new Response('Not found', { status: 404 });
  let u = await getUser(tok.c);
  if (!u) return new Response('Not found', { status: 404 });
  if (!isMember(u) && u.customer) u = await refreshMembership(u);
  const list = isMember(u) && u.status === 'active' ? u.saved.map(id => eventById.get(id)).filter((e): e is EventItem => !!e) : [];
  return new Response(icsCalendar(list, siteUrl(req), 'My events — The Events Guy'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'private, max-age=900' },
  });
}
