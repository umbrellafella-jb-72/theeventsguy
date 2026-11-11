import dataset from '@/data/events.json';
import overrides from '@/data/overrides.json';
import { entryInfo } from './awards';
import { LISTING_DAYS, RELEASE_DAYS, releaseLabel } from './release';
export { LISTING_DAYS, RELEASE_DAYS, releaseLabel };

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
  /** On a member's locked copy: the day (YYYY-MM-DD) its full details are released, or null if its date isn't set. */
  opensOn?: string | null;
};

export type Speaker = {
  id: string; name: string; role: string | null; company: string | null; bio: string | null; linkedin: string | null; events: string[];
  topics?: string[];      // specialities
  image?: string | null;  // https link to their cartoon portrait
  featured?: boolean;     // spotlight: shown first
  openTo?: string[];
};
export type SpeakerRef = { id: string; name: string };

export type MediaItem = {
  id: string; name: string; type: string; mediaType: string; hosts: string | null; organisation: string | null;
  based: string | null; focus: string | null; frequency: string | null; url: string | null; whereText: string | null; topics: string[];
};

export type Taxonomy = { areas: string[]; formats: string[]; topics: string[]; sectors: string[]; regions: string[]; prices: string[]; statuses: string[]; mediaTypes: string[] };

export const TBC = 'tbc';
const data = dataset as unknown as { generatedAt: string; tabs: string[]; taxonomy: Taxonomy; events: EventItem[]; media: MediaItem[]; speakers?: Speaker[] };

// Hand edits in data/overrides.json (e.g. a featured event's video) sit on top of the sheet and
// survive the monthly refresh.
const OVERRIDES = overrides as unknown as Record<string, Partial<EventItem>>;
export const events: EventItem[] = data.events.map(e => (OVERRIDES[e.id] ? { ...e, ...OVERRIDES[e.id], id: e.id } : e));
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

/** Per-quarter summary (calendar quarters), counts only. An event spanning two months counts once. */
export function quarterSummaries() {
  const keys = monthKeys().filter(k => k !== TBC);
  const quarters = new Map<string, string[]>();
  for (const k of keys) { const q = `${k.slice(0, 4)}-Q${Math.floor((+k.slice(5, 7) - 1) / 3) + 1}`; quarters.set(q, [...(quarters.get(q) ?? []), k]); }
  return [...quarters.entries()].map(([key, months]) => {
    const list = events.filter(e => e.months.some(m => months.includes(m)));
    const y = key.slice(0, 4), n = +key.slice(6);
    // The current quarter starts at this month: earlier months have passed.
    const first = months[0], last = `${y}-${String(n * 3).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(+y, n * 3, 0)).getUTCDate();
    const short = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
    return {
      key, label: `Q${n} ${y}`, span: `${short(first)} – ${short(last)}`, months,
      from: `${first}-01`, to: `${last}-${String(lastDay).padStart(2, '0')}`,
      count: list.length,
      confirmed: list.filter(e => e.status === 'Confirmed').length,
      free: list.filter(e => e.priceTag === 'Free').length,
    };
  });
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
      // When this month's events start appearing: each event's date in this month (recurring events
      // count from the month's first day), less the listing window.
      listsOn: key === TBC ? null : list.map(e => { const s = startOf(e); return addDays(s && s > `${key}-01` ? s : `${key}-01`, -LISTING_DAYS); }).sort()[0] ?? null,
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

// ---------- Rolling release ----------
// Members — quarterly or yearly — get full details only for events starting in the next
// RELEASE_DAYS days (plus anything already past, featured, or in the free month). Everything
// further out stays a teaser until it comes into range, so the full year can't be copied out
// and shared in one go. Undated events stay locked until a date is published.

const addDays = (ymd: string, n: number) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** The last start date whose details are released today. */
export const releaseCutoff = (now = new Date()) => addDays(todayKey(now), RELEASE_DAYS);
const startOf = (e: EventItem) => (/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(e.sortKey) ? e.sortKey : null);
/** An award's next entry deadline, if one is published. */
const deadlineOf = (e: EventItem, now = new Date()) => (e.format === 'Awards' ? (entryInfo(e.entryDeadline, todayKey(now)).next as string | null) : null);
/** The day this event's details are released to members (null while no date is known). Awards
 *  open on whichever comes first: 30 days before the entry deadline or before the ceremony. */
export const opensOn = (e: EventItem) => {
  const dates = [startOf(e), deadlineOf(e)].filter((d): d is string => !!d).sort();
  return dates.length ? addDays(dates[0], -RELEASE_DAYS) : null;
};
export function released(e: EventItem, now = new Date()): boolean {
  const cut = releaseCutoff(now);
  const s = startOf(e), dl = deadlineOf(e, now);
  return Boolean((s && s <= cut) || (dl && dl <= cut));
}

// ---------- Rolling listing ----------
// Nothing further out than LISTING_DAYS is sent to anyone (apart from featured events and the free
// month): an event appears as a teaser 60 days ahead and opens in full for members at 30 days.
/** The day an event first appears in the guide (null while no date is known). */
export const listsOn = (e: EventItem) => {
  const dates = [startOf(e), deadlineOf(e)].filter((d): d is string => !!d).sort();
  return dates.length ? addDays(dates[0], -LISTING_DAYS) : null;
};
export function listed(e: EventItem, now = new Date()): boolean {
  const cut = addDays(todayKey(now), LISTING_DAYS);
  const s = startOf(e), dl = deadlineOf(e, now);
  return Boolean((s && s <= cut) || (dl && dl <= cut));
}
/** May this viewer see that the event exists at all? Visitors: free month and featured only.
 *  Free accounts and members: also anything within the listing window. */
export function visibleTo(e: EventItem, paid: boolean, signedIn: boolean, previewMonth = currentMonthKey()): boolean {
  return openToAll(e, previewMonth) || ((paid || signedIn) && listed(e));
}

/** May this visitor see the whole event? Everyone: featured and the free month. Members: also
 *  anything starting within the release window. */
export function fullFor(e: EventItem, paid: boolean, previewMonth = currentMonthKey()): boolean {
  return openToAll(e, previewMonth) || (paid && released(e));
}

/** The public subset of an event, safe to send to any browser. */
export function teaser(e: EventItem, paid = false): EventItem {
  return {
    id: e.id, kind: e.kind, name: e.name, dates: e.dates, months: e.months, sortKey: e.sortKey, status: e.status,
    area: e.area, city: e.city, region: e.region, organiser: e.organiser, format: e.format, sectors: e.sectors,
    venue: null, type: null, topics: [], price: null, priceTag: '', frequency: null, lastEdition: null, website: null,
    locked: true, ...(paid ? { opensOn: opensOn(e) } : {}),
  };
}

/** The events this viewer may see, each whole or as a teaser. Events beyond the listing window aren't included. */
export function eventsFor(paid: boolean, previewMonth = currentMonthKey(), signedIn = true): EventItem[] {
  return events.filter(e => visibleTo(e, paid, signedIn, previewMonth)).map(e => (fullFor(e, paid, previewMonth) ? e : teaser(e, paid)));
}

/** Featured events first within a list, keeping the original order otherwise. */
export const featuredFirst = (list: EventItem[]) => [...list].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

// ---------- Picking events in portal forms ----------
export const eventLabel = (e: EventItem) => `${e.name} · ${e.dates || 'date TBC'} · ${e.city}`;
const byLabel = new Map(events.map(e => [eventLabel(e), e.id]));
/** An event id from a form value that's either an id or a label picked from the list. */
export const eventIdFrom = (v: string) => (eventById.has(v) ? v : byLabel.get(v.trim()) ?? null);
