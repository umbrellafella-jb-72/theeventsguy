import { renderEvents } from '@/lib/templates';
import changes from '@/data/changes.json';
import { eventById, listed, monthLabel } from '@/lib/data';
import { getValue, setValue, storeReady } from '@/lib/store';
import { allUsers, isMember } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { cronAllowed, memberLinks } from '@/lib/cron';
import { siteUrl } from '@/lib/stripe';

// "New events" email. Runs daily (vercel.json); sends once per weekly refresh that added events,
// to members with an active subscription who haven't opted out.
export async function GET(req: Request) {
  if (!cronAllowed(req)) return new Response('Unauthorised', { status: 401 });
  if (!storeReady()) return Response.json({ skipped: 'member database not set up' });
  const c = changes as { generatedAt: string; added: string[] };
  if (!c.added.length || (await getValue('digest:last')) === c.generatedAt) return Response.json({ skipped: 'nothing new' });
  await setValue('digest:last', c.generatedAt);

  const base = siteUrl(req);
  // Only events already inside the 60-day listing window; later ones appear in the guide when they're listed.
  const added = c.added.map(id => eventById.get(id)).filter(e => e && listed(e)).sort((a, b) => (a!.sortKey || '9').localeCompare(b!.sortKey || '9'));
  if (!added.length) return Response.json({ skipped: 'nothing new inside the listing window' });
  const items = added.slice(0, 40).map(e => ({ name: e!.name, when: e!.dates || (e!.months[0] ? monthLabel(e!.months[0]) : 'Date TBC'), where: e!.city, url: `${base}/events/${e!.id}` }));
  let sent = 0;
  for (const m of await allUsers()) {
    if (m.status !== 'active' || !m.prefs.newEvents || !isMember(m)) continue;
    const links = memberLinks(m.id);
    const n = String(added.length), plural = added.length === 1 ? '' : 's';
    const mail = await renderEvents('digest', { count: n, s: plural }, {
      items, manageUrl: links.manage, unsubscribeUrl: links.off('newEvents'),
      ...(added.length > items.length ? { footer: `And ${added.length - items.length} more in the guide: ${base}/guide` } : {}),
    });
    if (await sendEmail({ to: m.email, ...mail, unsubscribeUrl: links.off('newEvents'), tag: 'digest' })) sent++;
  }
  return Response.json({ added: added.length, sent });
}
