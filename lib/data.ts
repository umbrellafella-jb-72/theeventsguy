import dataset from '@/data/events.json';

export type EventItem = {
  id: string;
  kind: 'event' | 'award';
  name: string;
  dates: string;
  months: string[];
  sortKey: string;
  status: 'Confirmed' | 'Tentative' | 'TBC';
  area: string;
  city: string;
  venue: string | null;
  organiser: string | null;
  type: string | null;
  format: string;
  topics: string[];
  price: string | null;
  priceTag: string;
  region: string;
  frequency: string | null;
  lastEdition: string | null;
  website: string | null;
  scope?: string | null;
  categories?: string | null;
  entryDeadline?: string | null;
};

export type Speaker = { id: string; name: string; role: string | null; company: string | null; bio: string | null; linkedin: string | null; events: string[] };
export type SpeakerRef = { id: string; name: string };

export type MediaItem = {
  id: string; name: string; type: string; mediaType: string; hosts: string | null; organisation: string | null;
  based: string | null; focus: string | null; frequency: string | null; url: string | null; whereText: string | null; topics: string[];
};

export type Taxonomy = { areas: string[]; formats: string[]; topics: string[]; regions: string[]; prices: string[]; statuses: string[]; mediaTypes: string[] };

export const TBC = 'tbc';
const data = dataset as unknown as { generatedAt: string; tabs: string[]; taxonomy: Taxonomy; events: EventItem[]; media: MediaItem[]; speakers?: Speaker[] };

export const events = data.events;
export const taxonomy = data.taxonomy;
export const media = data.media;
export const speakers: Speaker[] = data.speakers ?? [];
export const eventById = new Map(events.map(e => [e.id, e]));

/** eventId → the speakers on it, for the event cards. */
export function speakersByEvent(): Record<string, SpeakerRef[]> {
  const out: Record<string, SpeakerRef[]> = {};
  for (const s of speakers) for (const id of s.events) (out[id] ||= []).push({ id: s.id, name: s.name });
  return out;
}

/** Where an event lives in the guide: its first month (or the TBC list) plus its anchor. */
export function eventHref(e: EventItem): string {
  return `/guide?month=${e.months[0] ?? TBC}#ev-${e.id}`;
}
export const generatedAt = data.generatedAt;

/** "2027-03" in Europe/London, today. */
export function currentMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}

export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now); // YYYY-MM-DD
}

/** Months from the current one onwards that have events, plus "tbc" if any are undated. */
export function monthKeys(): string[] {
  const cur = currentMonthKey();
  const set = new Set<string>();
  for (const e of events) for (const m of e.months) if (m >= cur) set.add(m);
  const keys = [...set].sort();
  if (events.some(e => !e.months.length)) keys.push(TBC);
  return keys;
}

export function monthLabel(key: string, style: 'long' | 'short' = 'long'): string {
  if (key === TBC) return style === 'long' ? 'Dates to be confirmed' : 'TBC';
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: style, year: 'numeric', timeZone: 'UTC' });
}

export function eventsIn(key: string): EventItem[] {
  return events.filter(e => (key === TBC ? !e.months.length : e.months.includes(key)));
}

/** Per-month summary, safe to show to anyone: counts only, no event details. */
export function monthSummaries() {
  return monthKeys().map(key => {
    const list = eventsIn(key);
    const formats: Record<string, number> = {};
    for (const e of list) formats[e.format] = (formats[e.format] || 0) + 1;
    return {
      key,
      label: monthLabel(key),
      count: list.length,
      confirmed: list.filter(e => e.status === 'Confirmed').length,
      free: list.filter(e => e.priceTag === 'Free').length,
      europe: list.filter(e => e.area === 'Europe').length,
      awards: list.filter(e => e.format === 'Awards').length,
      formats: Object.entries(formats).sort((a, b) => b[1] - a[1]),
    };
  });
}
