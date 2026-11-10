// Add-to-calendar, shared by the app and the preview: Google Calendar, Outlook.com, Microsoft 365
// and an .ics file (Apple Calendar, Outlook desktop and anything else). Works from the event's
// dates text and sort key; uses the start and end times when the sheet has them, otherwise all-day.

const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const addDays = (key, n) => new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10) + n)).toISOString().slice(0, 10);

// Country → time zone for Europe events; UK & Ireland, global and online fall back to London.
const TZ = {
  Ireland: 'Europe/Dublin', 'Northern Ireland': 'Europe/London', Portugal: 'Europe/Lisbon', Spain: 'Europe/Madrid', France: 'Europe/Paris',
  Belgium: 'Europe/Brussels', Netherlands: 'Europe/Amsterdam', Germany: 'Europe/Berlin', Austria: 'Europe/Vienna', Switzerland: 'Europe/Zurich',
  Italy: 'Europe/Rome', Denmark: 'Europe/Copenhagen', Sweden: 'Europe/Stockholm', Norway: 'Europe/Oslo', Finland: 'Europe/Helsinki',
  Poland: 'Europe/Warsaw', Czechia: 'Europe/Prague', 'Czech Republic': 'Europe/Prague', Hungary: 'Europe/Budapest', Greece: 'Europe/Athens',
  Estonia: 'Europe/Tallinn', Latvia: 'Europe/Riga', Lithuania: 'Europe/Vilnius', Romania: 'Europe/Bucharest', Croatia: 'Europe/Zagreb',
  Luxembourg: 'Europe/Luxembourg', Malta: 'Europe/Malta', Iceland: 'Atlantic/Reykjavik', Nordics: 'Europe/Stockholm', Baltics: 'Europe/Riga',
};
export function timeZoneOf(e) {
  if (/dublin|cork|galway|limerick/i.test(e.city || '')) return 'Europe/Dublin';
  return TZ[e.region] || (e.area === 'Europe' ? 'Europe/Berlin' : 'Europe/London');
}

/** { start, end } as YYYY-MM-DD (end inclusive), or null when the date isn't fixed yet. */
export function eventDates(e) {
  const sk = (e.sortKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!sk || e.status === 'TBC' || +sk[2] > 12) return null;
  const start = sk[0], y = +sk[1];
  const t = (e.dates || '').toLowerCase();
  let end = start;
  // "22–23 Apr", "22-24 April", "30 Apr – 1 May", "Tue 22 – Wed 23 Apr"
  const cross = t.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s*(?:[-–]|to)\s*(?:[a-z]{3}\s+)?(\d{1,2})\s+([a-z]{3})/);
  const same = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–]|to)\s*(?:[a-z]{3}\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})/);
  if (cross && MON.includes(cross[4])) end = iso(y + (MON.indexOf(cross[4]) < MON.indexOf(cross[2]) ? 1 : 0), MON.indexOf(cross[4]) + 1, +cross[3]);
  else if (same && MON.includes(same[3])) end = iso(y, MON.indexOf(same[3]) + 1, +same[2]);
  if (end < start || end > addDays(start, 14)) end = start;
  return { start, end };
}

function parts(e, siteUrl) {
  const d = eventDates(e);
  if (!d) return null;
  const tz = timeZoneOf(e);
  const timed = Boolean(e.startTime);
  const where = [e.venue, e.city].filter(Boolean).join(', ');
  const page = `${siteUrl}/events/${e.id}`;
  const link = e.bookingUrl || e.website;
  const details = [e.description, `${e.dates}${e.status !== 'Confirmed' ? ` (${e.status.toLowerCase()} — check with the organiser)` : ''}`, link ? `Tickets and details: ${link}` : null, `On The Events Guy: ${page}`].filter(Boolean).join('\n\n');
  return { ...d, tz, timed, where, details, title: e.name, page };
}

const compact = s => s.replace(/-/g, '');
const hhmm = t => t.replace(':', '') + '00';

export function googleUrl(e, siteUrl) {
  const p = parts(e, siteUrl); if (!p) return null;
  const dates = p.timed
    ? `${compact(p.start)}T${hhmm(e.startTime)}/${compact(p.end)}T${hhmm(e.endTime || e.startTime)}`
    : `${compact(p.start)}/${compact(addDays(p.end, 1))}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: p.title, dates, details: p.details, location: p.where });
  if (p.timed) q.set('ctz', p.tz);
  return `https://calendar.google.com/calendar/render?${q}`;
}

function outlook(host, e, siteUrl) {
  const p = parts(e, siteUrl); if (!p) return null;
  const q = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: p.title, body: p.details, location: p.where });
  if (p.timed) { q.set('startdt', `${p.start}T${e.startTime}:00`); q.set('enddt', `${p.end}T${e.endTime || e.startTime}:00`); }
  else { q.set('startdt', p.start); q.set('enddt', addDays(p.end, 1)); q.set('allday', 'true'); }
  return `https://${host}/calendar/0/deeplink/compose?${q}`;
}
export const outlookUrl = (e, siteUrl) => outlook('outlook.live.com', e, siteUrl);
export const office365Url = (e, siteUrl) => outlook('outlook.office.com', e, siteUrl);

const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, m => `\\${m}`).replace(/\r?\n/g, '\\n');
// Lines over 75 octets must be folded (RFC 5545).
const fold = line => line.length <= 74 ? line : line.match(/.{1,73}/g).join('\r\n ');

/** One VEVENT block, or null when the date isn't fixed. */
export function icsEvent(e, siteUrl, stamp = new Date()) {
  const p = parts(e, siteUrl); if (!p) return null;
  const when = p.timed
    ? [`DTSTART;TZID=${p.tz}:${compact(p.start)}T${hhmm(e.startTime)}`, `DTEND;TZID=${p.tz}:${compact(p.end)}T${hhmm(e.endTime || e.startTime)}`]
    : [`DTSTART;VALUE=DATE:${compact(p.start)}`, `DTEND;VALUE=DATE:${compact(addDays(p.end, 1))}`];
  return ['BEGIN:VEVENT', `UID:${e.id}@theeventsguy.co.uk`, `DTSTAMP:${stamp.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, ...when,
    `SUMMARY:${icsEsc(p.title)}`, `LOCATION:${icsEsc(p.where)}`, `DESCRIPTION:${icsEsc(p.details)}`, `URL:${p.page}`,
    `STATUS:${e.status === 'Confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`, 'END:VEVENT'].map(fold).join('\r\n');
}

/** A whole calendar file from a list of events (one for a single event, many for a shortlist feed). */
export function icsCalendar(list, siteUrl, name = 'The Events Guy') {
  const body = list.map(e => icsEvent(e, siteUrl)).filter(Boolean);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Events Guy//Ecommerce events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEsc(name)}`, 'X-PUBLISHED-TTL:PT6H', ...body, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/** Plain-text details for "Copy details" and sharing. */
export function shareText(e, siteUrl) {
  return [e.name, e.dates, [e.venue, e.city].filter(Boolean).join(', '), e.organiser ? `By ${e.organiser}` : null, `${siteUrl}/events/${e.id}`].filter(Boolean).join('\n');
}
