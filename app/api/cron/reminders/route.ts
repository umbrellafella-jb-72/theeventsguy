import { renderEvents } from '@/lib/templates';
import { eventById, todayKey } from '@/lib/data';
import { eventDates } from '@/lib/calendar';
import { claimOnce, storeReady } from '@/lib/store';
import { allUsers, isMember } from '@/lib/users';
import { sendEmail } from '@/lib/email';
import { cronAllowed, memberLinks } from '@/lib/cron';
import { siteUrl } from '@/lib/stripe';

// Reminders for saved events: a week before and the day before. Runs daily (vercel.json).
const LEADS = [7, 1];
const addDays = (key: string, n: number) => new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10) + n)).toISOString().slice(0, 10);

export async function GET(req: Request) {
  if (!cronAllowed(req)) return new Response('Unauthorised', { status: 401 });
  if (!storeReady()) return Response.json({ skipped: 'member database not set up' });
  const base = siteUrl(req), today = todayKey();
  let sent = 0;
  for (const m of await allUsers()) {
    if (m.status !== 'active' || !m.prefs.reminders || !isMember(m)) continue;
    const due: { e: NonNullable<ReturnType<typeof eventById.get>>; lead: number }[] = [];
    for (const id of m.saved) {
      const e = eventById.get(id); const d = e && eventDates(e);
      if (!e || !d) continue;
      for (const lead of LEADS) if (d.start === addDays(today, lead) && (await claimOnce(`rem:${m.id}:${id}:${lead}`, 30 * 86400))) due.push({ e, lead });
    }
    if (!due.length) continue;
    const links = memberLinks(m.id);
    const mail = await renderEvents('reminder', {
      first_event: due.length === 1 ? due[0].e.name : `${due.length} saved events coming up`,
      headline: due.length === 1 ? `${due[0].e.name} is ${due[0].lead === 1 ? 'tomorrow' : 'next week'}` : `${due.length} of your events are coming up`,
    }, {
      items: due.map(({ e, lead }) => ({ name: e.name, when: `${lead === 1 ? 'Tomorrow' : 'In a week'} · ${e.dates}`, where: [e.venue, e.city].filter(Boolean).join(', '), url: `${base}/events/${e.id}` })),
      manageUrl: links.manage, unsubscribeUrl: links.off('reminders'),
    });
    if (await sendEmail({ to: m.email, ...mail, unsubscribeUrl: links.off('reminders'), tag: 'reminder' })) sent++;
  }
  return Response.json({ sent });
}
