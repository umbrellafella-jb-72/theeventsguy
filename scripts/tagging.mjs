// Turns raw spreadsheet rows into clean, tagged events.
// The sheet's Notes column is private (contacts, partner terms, personal history):
// it is read here ONLY to infer topic tags and is never written to the output.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- Format (one per event) ----------
// Order matters: the first matching rule wins.
export const FORMAT_RULES = [
  ['Awards', /award/i],
  ['Festival', /festival|tech week|conference week/i],
  ['Trade show & expo', /trade show|trade fair|expo|exhibition|\bshow\b|fashion \/ retail/i],
  ['Conference & summit', /conference|summit|congress|symposium|one-day event|half-day|programme day|customer event|talks|\bday\b/i],
  ['Forum & roundtable', /forum|roundtable|panel|briefing|exchange|think tank/i],
  ['Workshop & training', /workshop|training|masterclass|course/i],
  ['Dinner & social', /dinner|lunch|social|drinks|comedy|padel|retreat|evening|supper|party|hospitality|golf/i],
  ['Meetup & networking', /meetup|networking|breakfast|community|club|meetings event|member|partner event|agency leader|morning event/i],
];
export const FORMATS = [...FORMAT_RULES.map(r => r[0]), 'Other'];

export function formatOf(type) {
  for (const [name, re] of FORMAT_RULES) if (re.test(type || '')) return name;
  return 'Other';
}

// ---------- Topics (zero or more) ----------
export const TOPIC_RULES = [
  ['AI', /\bai\b|artificial intelligence|generative|\bgeo\b|llm|agentic/i],
  ['Retail', /retail|\bstore|merchant|high street|fmcg/i],
  ['DTC & brands', /\bdtc\b|\bd2c\b|direct.to.consumer|brand/i],
  ['Marketing', /marketing|martech|paid & performance|performance media|creator|advertis|social media|content|influencer|\bcmo\b|\bmad\b/i],
  ['Affiliate & partnerships', /affiliate|partnership|performance marketing|performancein|\bpi live\b/i],
  ['Search & SEO', /\bseo\b|search|brighton ?seo|zero.?click/i],
  ['Shopify', /shopify/i],
  ['Marketplaces & Amazon', /amazon|marketplace/i],
  ['Payments & fintech', /payment|fintech|finance|\bcfo\b|fraud|merchant risk|\bmrc\b/i],
  ['B2B commerce', /\bb2b\b/i],
  ['Agencies', /agenc/i],
  ['CX & retention', /\bcx\b|customer experience|\bcrm\b|retention|loyalty|reviews?\b/i],
  ['Fashion & beauty', /fashion|beauty|apparel|luxury/i],
  ['Logistics & delivery', /logistic|delivery|fulfil|supply chain|parcel|warehous/i],
  ['Data & analytics', /\bdata\b|analytics|insight/i],
  ['Food, drink & hospitality', /beer|food|drink|hotel|restaurant|catering|hospitality|f&b|scothot/i],
  ['Travel, leisure & gaming', /travel|\bwtm\b|gaming|leisure/i],
  ['Tech & startups', /tech week|venture|startup|founder|innovation|tech festival|edtech|white label/i],
  ['Commerce tech', /ecommerce tech|platform|woocommerce|wordpress|magento|salesforce|headless|composable|tech show|retail tech|technology/i],
];
// Anything ecommerce-flavoured with no specific topic still gets the general tag.
const GENERAL = ['Ecommerce (general)', /e-?com|ecommerce|digital|online|d2c|retail|shop|packaging/i];
export const TOPICS = [...TOPIC_RULES.map(r => r[0]), GENERAL[0]];

export function topicsOf(text) {
  const hits = TOPIC_RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
  return hits.length || !GENERAL[1].test(text) ? hits : [GENERAL[0]];
}

// ---------- Price ----------
export const PRICES = ['Free', 'Paid', 'Invite only', 'Members only', 'Price not published'];
export function priceOf(p) {
  const s = (p || '').toLowerCase();
  if (!s) return 'Price not published';
  if (/^free|free (for|to|visitor|trade|ticket|expo|with|vip)|free$/.test(s) || s.startsWith('free')) return 'Free';
  if (/invite|invitation/.test(s)) return 'Invite only';
  if (/member/.test(s) && !/£|€|\$/.test(s.split('member')[0])) return 'Members only';
  if (/£|€|\$|paid|ticketed|pay what|low cost|general admission|from /.test(s)) return 'Paid';
  return 'Price not published';
}

// ---------- Area & region ----------
export const AREAS = ['UK & Ireland', 'Europe', 'Global & online'];

const UK_RULES = [
  ['Online', /online|virtual|webinar/i],
  ['Multiple cities', /\band\b|\+|\/|,/],
  ['London', /london|wembley|excel|olympia/i],
  ['North West', /manchester|liverpool|cheshire|dukinfield|salford|preston/i],
  ['Yorkshire', /leeds|sheffield|bradford|wakefield|york|harrogate|hull/i],
  ['North East', /newcastle|sunderland|durham/i],
  ['Midlands', /birmingham|nottingham|sutton coldfield|lincoln|leicester|coventry|derby|midlands/i],
  ['South & South West', /brighton|bristol|ascot|knebworth|farnborough|reading|southampton|oxford|cambridge|bath|exeter/i],
  ['Scotland', /edinburgh|glasgow|aberdeen|dundee|scotland/i],
  ['Wales', /cardiff|swansea|newport|wales/i],
  ['Northern Ireland', /belfast|derry/i],
  ['Ireland', /dublin|cork|galway|limerick|kinsale|ireland/i],
];
const UK_REGIONS = UK_RULES.map(r => r[0]);

// European countries as written in the sheet ("Berlin, Germany", "Malta", "Brno, Czech Republic")
const COUNTRY_ALIASES = { 'czech republic': 'Czechia', holland: 'Netherlands', 'the netherlands': 'Netherlands', türkiye: 'Turkey' };
const COUNTRIES = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Iceland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Monaco', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania',
  'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine'];
export const REGIONS = [...UK_REGIONS, ...COUNTRIES, 'Location TBC'];

// Cities that sometimes appear without their country
const CITY_COUNTRY = { paris: 'France', berlin: 'Germany', amsterdam: 'Netherlands', barcelona: 'Spain', madrid: 'Spain', milan: 'Italy', munich: 'Germany', stockholm: 'Sweden', copenhagen: 'Denmark', lisbon: 'Portugal', vienna: 'Austria', prague: 'Czechia', warsaw: 'Poland', cannes: 'France' };

function countryOf(city) {
  const main = (city || '').replace(/\(.*?\)/g, '').trim();
  if (CITY_COUNTRY[main.toLowerCase()]) return CITY_COUNTRY[main.toLowerCase()];
  const parts = main.split(',').map(p => p.trim()).filter(Boolean);
  for (const p of [parts[parts.length - 1], parts[0]]) {
    if (!p) continue;
    const k = p.toLowerCase();
    if (COUNTRY_ALIASES[k]) return COUNTRY_ALIASES[k];
    const hit = COUNTRIES.find(c => c.toLowerCase() === k);
    if (hit) return hit;
  }
  return null;
}

export function regionOf(city, area = 'UK & Ireland') {
  const c = (city || '').trim();
  if (!c || /^not stated|^uk$|tbc$|^tba/i.test(c)) return 'Location TBC';
  const main = c.replace(/\(.*?\)/g, '').trim();
  if (/online|virtual/i.test(main)) return 'Online';
  if (area === 'Europe' || /,\s*[A-Z]/.test(main) || CITY_COUNTRY[main.toLowerCase()]) {
    if (/ireland/i.test(main)) return 'Ireland';
    return countryOf(c) || (area === 'Europe' ? 'Location TBC' : 'Location TBC');
  }
  // "London (venue TBC)" or "London (+ Leeds)": judge the part before the bracket first
  for (const [name, re] of UK_RULES) if (re.test(main)) return name;
  return 'Location TBC';
}

// ---------- Status ----------
export const STATUSES = ['Confirmed', 'Tentative', 'TBC'];
export function statusOf(s) {
  const t = (s || '').trim().toLowerCase();
  if (t.startsWith('confirmed')) return 'Confirmed';
  if (t.startsWith('tentative')) return 'Tentative';
  return 'TBC';
}

// ---------- Dates → months ----------
// Returns every "YYYY-MM" an event appears in. Series rows that list many dates
// ("Tue 19 Jan, Tue 9 Feb, …") appear in each of those months.
export function monthsOf(dateText, sortKey) {
  const yearMatch = (dateText || '').match(/\b(20\d\d)\b/);
  const fallbackYear = Number((sortKey || '').slice(0, 4)) || 2027;
  const year = yearMatch ? Number(yearMatch[1]) : fallbackYear;
  // Text that only quotes an older edition ("2024: 8 May, 8 Aug") is not a current date.
  if (yearMatch && year < fallbackYear) dateText = '';
  const re = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/g;
  const out = new Set();
  let m;
  while ((m = re.exec(dateText || ''))) out.add(`${year}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, '0')}`);
  if (out.size) return [...out].sort();
  const sk = (sortKey || '').match(/^(\d{4})-(\d{2})/);
  if (sk && Number(sk[2]) >= 1 && Number(sk[2]) <= 12) return [`${sk[1]}-${sk[2]}`];
  return []; // date TBC
}

// Brackets in these columns hold private context (contacts, "from your Gmail label"…).
const stripBrackets = s => s.replace(/\s*\([^)]*\)/g, '').replace(/\s{2,}/g, ' ').trim();

function slug(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function cleanUrl(u) {
  const s = (u || '').trim();
  if (!s || /\s/.test(s) || !/\./.test(s)) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

const getter = row => k => (row[k] ?? '').toString().trim();
const manualTagsOf = get => get('Tags').split(/[;,]/).map(t => t.trim()).filter(Boolean); // optional extra column

// ---------- UK & Ireland / Rest of Europe tabs ----------
// Status shows only its label: the sheet's detail mentions internal sources.
export function toEvent(row, area = 'UK & Ireland') {
  const get = getter(row);
  const name = get('Event');
  if (!name) return null;
  const type = get('Type');
  const dateText = get('2027 Date(s)');
  const sortKey = get('Sort key');
  const city = get('City');
  const price = get('Price Point');
  const topics = [...new Set([...topicsOf([name, get('Organiser'), type, get('Notes')].join(' ')), ...manualTagsOf(get)])];
  return {
    id: `${slug(name)}-${slug(sortKey || dateText)}`,
    kind: 'event',
    name,
    dates: dateText.replace(/\s*\(2027\)\s*$/, ''),
    months: monthsOf(dateText, sortKey),
    sortKey,
    status: statusOf(get('Date Status')),
    area,
    city: city.replace(/\s*\((per listing|check)\)\s*/i, '') || 'Not stated',
    venue: get('Venue') || null,
    organiser: stripBrackets(get('Organiser')) || null,
    type: type || null,
    format: formatOf(type),
    topics,
    price: price || null,
    priceTag: priceOf(price),
    region: regionOf(city, area),
    frequency: get('Frequency') || null,
    lastEdition: stripBrackets(get('2026 / 2025 Reference')) || null,
    website: cleanUrl(get('Website')),
  };
}

// ---------- Awards tab ----------
// Skips awards outside the UK, Europe and global scope (US, APAC, MENA) for now.
// "Sponsors / partners" (contact names and emails) and "Notes" are never published.
const OUT_OF_SCOPE = /^(us|usa|apac|mena|americas|latam)\b/i;
function awardArea(scope, city) {
  if (/,\s*[A-Z]/.test(city) && !/ireland/i.test(city)) return 'Europe';
  if (/london|manchester|leeds|birmingham|edinburgh|glasgow|dublin|belfast|cardiff|ireland/i.test(city)) return 'UK & Ireland';
  if (/^uk/i.test(scope)) return 'UK & Ireland';
  if (/europe|dach|baltic|netherlands|emea/i.test(scope)) return 'Europe';
  return 'Global & online';
}
export function toAward(row) {
  const get = getter(row);
  const name = get('Awards');
  const scope = get('Scope');
  if (!name || OUT_OF_SCOPE.test(scope) || /australia/i.test(get('City'))) return null;
  const dateText = get('Ceremony date');
  const sortKey = get('Sort key');
  const city = get('City');
  const area = awardArea(scope, city);
  const price = get('Entry fee / tickets');
  const categories = get('Focus / key categories');
  return {
    id: `${slug(name)}-${slug(sortKey || dateText)}`,
    kind: 'award',
    name,
    dates: dateText === 'TBC' ? 'Date TBC' : dateText,
    months: monthsOf(dateText, sortKey),
    sortKey,
    status: statusOf(get('Date status')),
    area,
    city: city || (area === 'Global & online' ? 'Online' : 'Not stated'),
    venue: get('Venue') || null,
    organiser: stripBrackets(get('Organiser')) || null,
    type: 'Awards',
    format: 'Awards',
    topics: [...new Set([...topicsOf([name, get('Organiser'), categories, get('Notes')].join(' ')), ...manualTagsOf(get)])],
    price: price || null,
    priceTag: price ? priceOf(price) : 'Price not published',
    region: regionOf(city || (area === 'Global & online' ? 'Online' : ''), area),
    frequency: 'Annual',
    lastEdition: null,
    website: cleanUrl(get('Website')),
    scope: scope || null,
    categories: categories || null,
    entryDeadline: /^(check site)?$/i.test(get('Entry deadline(s)')) ? null : get('Entry deadline(s)'),
  };
}

// ---------- Webinars & Podcasts tab ----------
// A directory, not dated events. "Contact / socials", "Why plug in", "Priority" and
// "Last checked" are private working notes and are never published.
export const MEDIA_TYPES = ['Podcast', 'Webinars & live training', 'Online summit or launch'];
function mediaType(t) {
  if (/podcast/i.test(t)) return 'Podcast';
  if (/webinar|training/i.test(t)) return 'Webinars & live training';
  return 'Online summit or launch';
}
export function toMedia(row) {
  const get = getter(row);
  const name = get('Name');
  if (!name) return null;
  const type = get('Type');
  const focus = get('Focus / audience');
  const where = get('Where to find it');
  const url = cleanUrl(where);
  return {
    id: slug(name),
    name: name.replace(/\s*\(check current name\)\s*/i, ''),
    type,
    mediaType: mediaType(type),
    hosts: get('Host(s)') || null,
    organisation: get('Organisation') || null,
    based: get('Based') || null,
    focus: focus || null,
    frequency: get('Frequency') || null,
    url,
    whereText: url ? null : where || null,
    topics: topicsOf([name, focus, get('Organisation')].join(' ')),
  };
}

// ---------- Speakers tab ----------
// Columns: Name, Role, Company, Bio, LinkedIn, Event(s). Events are matched by name (several
// separated by ";"), to the next edition on or after today. LinkedIn must be a profile URL.
const LINKEDIN = /^https:\/\/(www\.|[a-z]{2}\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+\/?$/;
export function toSpeaker(row, events, today) {
  const get = getter(row);
  const name = get('Name');
  if (!name) return null;
  let li = get('LinkedIn'); if (li && !/^https?:/i.test(li)) li = 'https://' + li.replace(/^\/+/, '');
  li = li.replace(/^http:/i, 'https:').split('?')[0];
  const wanted = (get('Event(s)') || get('Events') || get('Event')).split(';').map(t => t.trim().toLowerCase()).filter(Boolean);
  const matched = [], unmatched = [];
  for (const w of wanted) {
    const hits = events.filter(e => e.name.toLowerCase() === w || e.id === w).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const next = hits.find(e => (e.sortKey || '') >= today) || hits[hits.length - 1];
    if (next) matched.push(next.id); else unmatched.push(w);
  }
  const bio = get('Bio').replace(/\s+/g, ' ');
  return {
    speaker: {
      id: slug(name),
      name,
      role: get('Role') || null,
      company: get('Company') || null,
      bio: bio.length > 320 ? bio.slice(0, 317).replace(/\s+\S*$/, '') + '…' : bio || null,
      linkedin: LINKEDIN.test(li) ? li : null,
      events: [...new Set(matched)],
    },
    unmatched, badLinkedIn: !!li && !LINKEDIN.test(li),
  };
}

// ---------- Build ----------
// The same award often appears on the UK tab and the Awards tab: keep the Awards-tab
// row (it has categories and deadlines) and fold in the other row's topics.
const dedupeKey = e => `${e.name.toLowerCase().replace(/\b20\d\d\b/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '')}|${e.months[0] || 'tbc'}`;

export function buildDataset({ events: groups = [], awards = [], media = [], speakers = [] }, meta) {
  const awardRows = awards.map(toAward).filter(Boolean);
  const byKey = new Map(awardRows.map(a => [dedupeKey(a), a]));
  let merged = 0;
  const events = [];
  for (const { rows, area } of groups) {
    for (const row of rows) {
      const e = toEvent(row, area);
      if (!e) continue;
      const twin = e.format === 'Awards' && byKey.get(dedupeKey(e));
      if (twin) { twin.topics = [...new Set([...twin.topics, ...e.topics])]; twin.website ||= e.website; merged++; continue; }
      events.push(e);
    }
  }
  events.push(...awardRows);
  const seen = new Map();
  for (const e of events) { // keep ids unique
    const n = seen.get(e.id) || 0; seen.set(e.id, n + 1);
    if (n) e.id = `${e.id}-${n + 1}`;
  }
  events.sort((a, b) => (a.sortKey || '9999').localeCompare(b.sortKey || '9999') || a.name.localeCompare(b.name));
  const mediaItems = media.map(toMedia).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const sp = speakers.map(r => toSpeaker(r, events, today)).filter(Boolean);
  const seenSp = new Map();
  for (const x of sp) { const n = seenSp.get(x.speaker.id) || 0; seenSp.set(x.speaker.id, n + 1); if (n) x.speaker.id += '-' + (n + 1); }
  const usedRegions = new Set(events.map(e => e.region));
  return {
    generatedAt: new Date().toISOString(),
    ...meta,
    stats: { awardsMergedFromEventTabs: merged, awardsSkippedOutOfScope: awards.filter(r => r.Awards).length - awardRows.length,
      speakersUnmatched: sp.flatMap(x => x.unmatched.map(u => `${x.speaker.name}: "${u}"`)), speakersBadLinkedIn: sp.filter(x => x.badLinkedIn).map(x => x.speaker.name) },
    taxonomy: { areas: AREAS, formats: FORMATS, topics: TOPICS, regions: REGIONS.filter(r => usedRegions.has(r)), prices: PRICES, statuses: STATUSES, mediaTypes: MEDIA_TYPES },
    events,
    media: mediaItems,
    speakers: sp.map(x => x.speaker),
  };
}
