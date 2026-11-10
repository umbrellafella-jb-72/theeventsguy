import changes from '@/data/changes.json';
import { eventById, monthLabel } from '@/lib/data';
import { getValue, setValue, storeReady } from '@/lib/store';
import { allUsers, isMember } from '@/lib/users';
import { eventsEmail, sendEmail } from '@/lib/email';
import { cronAllowed, memberLinks } from '@/lib/cron';
import { siteUrl } from '@/lib/stripe';

// "New events" email. Runs daily (vercel.json); sends once per monthly refresh that added events,
// to members with an active subscription who haven't opted out.
export async function GET(req: Request) {
  if (!cronAllowed(req)) return new Response('Unauthorised', { status: 401 });
  if (!storeReady()) return Response.json({ skipped: 'member database not set up' });
  const c = changes as { generatedAt: string; added: string[] };
  if (!c.added.length || (await getValue('digest:last')) === c.generatedAt) return Response.json({ skipped: 'nothing new' });
  await setValue('digest:last', c.generatedAt);

  const base = siteUrl(req);
  const added = c.added.map(id => eventById.get(id)).filter(Boolean).sort((a, b) => (a!.sortKey || '9').localeCompare(b!.sortKey || '9'));
  const items = added.slice(0, 40).map(e => ({ name: e!.name, when: e!.dates || (e!.months[0] ? monthLabel(e!.months[0]) : 'Date TBC'), where: e!.city, url: `${base}/events/${e!.id}` }));
  let sent = 0;
  for (const m of await allUsers()) {
    if (m.status !== 'active' || !m.prefs.newEvents || !isMember(m)) continue;
    const links = memberLinks(m.id);
    const mail = eventsEmail({
      heading: `${added.length} new event${added.length === 1 ? '' : 's'} in the guide`,
      intro: `This month’s refresh added ${added.length} event${added.length === 1 ? '' : 's'}. Save the ones you want and they’ll go straight into your calendar feed.`,
      items, footer: added.length > items.length ? `And ${added.length - items.length} more in the guide: ${base}/guide` : 'See them all in the guide.',
      manageUrl: links.manage, unsubscribeUrl: links.off('newEvents'),
    });
    if (await sendEmail({ to: m.email, subject: `New in The Events Guy: ${added.length} event${added.length === 1 ? '' : 's'}`, ...mail, unsubscribeUrl: links.off('newEvents') })) sent++;
  }
  return Response.json({ added: added.length, sent });
}
