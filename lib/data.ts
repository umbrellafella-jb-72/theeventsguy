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
  judges?: string[];
  entryUrl?: string | null;
  eligibility?: string | null;
  howToEnter?: string | null;
  // Optional detail columns (see scripts/tagging.mjs → detailsOf)
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  bookingUrl?: string | null;
  sponsors?: string[];
  socials?: { label: string; url: string }[];
  organiserUrl?: string | null;
  sectors: string[];
  featured?: boolean;
  heroImage?: string | null;
  heroVideo?: string | null;
  /** Set on the copy sent to non-members: only the public fields are filled in. */
  locked?: boolean;
};

export type Speaker = { id: string; name: string; role: string | null; company: string | null; bio: string | null; linkedin: string | null; events: string[] };
export type SpeakerRef = { id: string; name: string };

export type MediaItem = {
  id: string; name: string; type: string; mediaType: string; hosts: string | null; organisation: string | null;
  based: string | null; focus: string | null; frequency: string | null; url: string | null; whereText: string | null; topics: string[];
};

export type Taxonomy = { areas: string[]; formats: string[]; topics: string[]; sectors: string[]; regions: string[]; prices: string[]; statuses: string[]; mediaTypes: string[] };

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

export type Judge = { name: string; speakerId: string | null; role: string | null; company: string | null; linkedin: string | null };

/** An award's judges: names from the Awards tab's Judges column plus anyone on the Speakers tab
 *  who lists the award. A name that matches a speaker profile picks up its role and LinkedIn. */
export function judgesFor(a: EventItem): Judge[] {
  const byName = new Map(speakers.map(s => [s.name.toLowerCase(), s]));
  const out = new Map<string, Judge>();
  const add = (name: string) => {
    const s = byName.get(name.toLowerCase());
    out.set(name.toLowerCase(), { name: s?.name ?? name, speakerId: s?.id ?? null, role: s?.role ?? null, company: s?.company ?? null, linkedin: s?.linkedin ?? null });
  };
  for (const n of a.judges ?? []) add(n);
  for (const s of speakers) if (s.events.includes(a.id)) add(s.name);
  return [...out.values()];
}

export const awards = events.filter(e => e.format === 'Awards');

// ---------- What's public ----------
// Anyone (and search engines) can see an event's name, dates, city, sector, format and organiser.
// Members see everything. Featured events, and the free preview month, are fully visible to all.

/** True when this event's full details may be shown to someone who isn't a member. */
export function openToAll(e: EventItem, previewMonth = currentMonthKey()): boolean {
  return Boolean(e.featured) || e.months.includes(previewMonth);
}

/** The public subset of an event, safe to send to any browser. */
export function teaser(e: EventItem): EventItem {
  return {
    id: e.id, kind: e.kind, name: e.name, dates: e.dates, months: e.months, sortKey: e.sortKey, status: e.status,
    area: e.area, city: e.city, region: e.region, organiser: e.organiser, format: e.format, sectors: e.sectors,
    venue: null, type: null, topics: [], price: null, priceTag: '', frequency: null, lastEdition: null, website: null,
    locked: true,
  };
}

/** Each event as this visitor may see it: whole, or as a teaser. */
export function eventsFor(paid: boolean, previewMonth = currentMonthKey()): EventItem[] {
  return paid ? events : events.map(e => (openToAll(e, previewMonth) ? e : teaser(e)));
}

/** Featured events first within a list, keeping the original order otherwise. */
export const featuredFirst = (list: EventItem[]) => [...list].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

// ---------- Picking events in portal forms ----------
export const eventLabel = (e: EventItem) => `${e.name} · ${e.dates || 'date TBC'} · ${e.city}`;
const byLabel = new Map(events.map(e => [eventLabel(e), e.id]));
/** An event id from a form value that's either an id or a label picked from the list. */
export const eventIdFrom = (v: string) => (eventById.has(v) ? v : byLabel.get(v.trim()) ?? null);
