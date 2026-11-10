import { getAccess } from '@/lib/access';
import { eventById, openToAll } from '@/lib/data';
import { icsCalendar } from '@/lib/calendar';
import { siteUrl } from '@/lib/stripe';

// One event as an .ics file: Apple Calendar, Outlook desktop and anything else.
// Members get any event; everyone else gets featured events and the free month's.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = eventById.get(id.replace(/\.ics$/, ''));
  if (!e) return new Response('Not found', { status: 404 });
  const a = await getAccess();
  if (!a.paid && !openToAll(e)) return Response.redirect(`${siteUrl(req)}/events/${e.id}?members=calendar`, 303);
  const body = icsCalendar([e], siteUrl(req), e.name);
  if (!body.includes('BEGIN:VEVENT')) return new Response('This event’s date isn’t fixed yet.', { status: 409 });
  return new Response(body, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${e.id}.ics"`, 'Cache-Control': 'private, max-age=300' },
  });
}
