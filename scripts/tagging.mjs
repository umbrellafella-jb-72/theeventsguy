// Turns raw spreadsheet rows into clean, tagged events.
// The sheet's Notes column is private (contacts, partner terms, personal history):
// it is read here ONLY to infer topic tags and is never written to the output.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- Format (one per event) ----------
// Order matters: the first matching rule wins.
export const FORMAT_RULES = [
  ['Awards', /award/i],
  ['Festival', /festival|tech week|conference week/i],
  ['Trade show & expo', /trade show|expo|exhibition|\bshow\b|fashion \/ retail/i],
  ['Conference & summit', /conference|summit|congress|symposium|one-day event|half-day|programme day|customer event|talks|\bday\b/i],
  ['Forum & roundtable', /forum|roundtable|panel|briefing/i],
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

// ---------- Region ----------
const REGION_RULES = [
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
  ['Ireland', /dublin|cork|galway|limerick|ireland/i],
];
export const REGIONS = [...REGION_RULES.map(r => r[0]), 'Location TBC'];

export function regionOf(city) {
  const c = (city || '').trim();
  if (!c || /^not stated|^uk$|tbc$/i.test(c)) return 'Location TBC';
  // "London (venue TBC)" or "London (+ Leeds)": judge the part before the bracket first
  const main = c.replace(/\(.*?\)/g, '').trim();
  for (const [name, re] of REGION_RULES) {
    if (name === 'Multiple cities') { if (re.test(main)) return name; continue; }
    if (re.test(main)) return name;
  }
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

// Public-safe display of the status: just the label; the sheet's detail mentions internal sources.
export function toEvent(row) {
  const get = k => (row[k] ?? '').toString().trim();
  const name = get('Event');
  if (!name) return null;
  const type = get('Type');
  const dateText = get('2027 Date(s)');
  const sortKey = get('Sort key');
  const city = get('City');
  const price = get('Price Point');
  const manualTags = get('Tags').split(/[;,]/).map(t => t.trim()).filter(Boolean); // optional extra column

  const tagText = [name, get('Organiser'), type, get('Notes')].join(' ');
  const topics = [...new Set([...topicsOf(tagText), ...manualTags])];

  return {
    id: `${slug(name)}-${slug(sortKey || dateText)}`,
    name,
    dates: dateText.replace(/\s*\(2027\)\s*$/, ''),
    months: monthsOf(dateText, sortKey),
    sortKey,
    status: statusOf(get('Date Status')),
    city: city.replace(/\s*\((per listing|check)\)\s*/i, '') || 'Not stated',
    venue: get('Venue') || null,
    organiser: stripBrackets(get('Organiser')) || null,
    type: type || null,
    format: formatOf(type),
    topics,
    price: price || null,
    priceTag: priceOf(price),
    region: regionOf(city),
    frequency: get('Frequency') || null,
    lastEdition: stripBrackets(get('2026 / 2025 Reference')) || null,
    website: cleanUrl(get('Website')),
  };
}

export function buildDataset(rows, meta) {
  const events = rows.map(toEvent).filter(Boolean);
  const seen = new Map();
  for (const e of events) { // keep ids unique
    const n = seen.get(e.id) || 0; seen.set(e.id, n + 1);
    if (n) e.id = `${e.id}-${n + 1}`;
  }
  events.sort((a, b) => (a.sortKey || '9999').localeCompare(b.sortKey || '9999') || a.name.localeCompare(b.name));
  return {
    generatedAt: new Date().toISOString(),
    ...meta,
    taxonomy: { formats: FORMATS, topics: TOPICS, regions: REGIONS, prices: PRICES, statuses: STATUSES },
    events,
  };
}
