// Draft copy for the Services and Sponsors pages. Shared with the preview mockup — edit here.
export const SERVICES = [
  {
    id: 'plan', who: 'For brands & retailers', title: 'Your events plan',
    body: 'A year-ahead plan of which events your team should attend, speak at or skip, built around your goals and budget.',
    points: ['A shortlist with the reason for each pick', 'Budget by quarter, tickets to travel', 'A clash check against your launches and trading peaks', 'A quarterly review: what paid off, what to drop'],
    scene: 'bridge',
  },
  {
    id: 'sponsor-advice', who: 'For tech vendors & agencies', title: 'Sponsorship & exhibiting advice',
    body: 'Which stands, dinners and sponsor packages actually reach buyers. We help you choose, negotiate and measure.',
    points: ['Events ranked by who is really in the room', 'A review of the package before you sign', 'A simple template to track leads and pipeline'],
    scene: 'crane',
  },
  {
    id: 'featured', who: 'For organisers', title: 'Featured listings',
    body: 'Put your event at the top of its month for subscribers, with your own description and booking link.',
    points: ['A Featured tag and top-of-month placement', 'A mention in the monthly update', 'Dates and prices kept right, straight from you'],
    scene: 'chimneys',
  },
  {
    id: 'team', who: 'For teams', title: 'Team access',
    body: 'One subscription for the whole team, with a shared calendar so everyone works from the same plan.',
    points: ['Seats for everyone who plans or travels', 'A calendar feed for Outlook and Google', 'One invoice'],
    scene: 'containers',
  },
] as const;

export const STEPS = [
  { title: 'Tell us what you need', body: 'A few lines in the form below is enough.' },
  { title: 'Get a short proposal', body: 'What we would do, by when, and what it costs.' },
  { title: 'We get to work', body: 'You get the plan, the listing or the seats, and a named contact.' },
];

export const PLACEMENTS = [
  { id: 'month', title: 'Month sponsor', body: 'Your name on one month of the guide: "November, brought to you by…". One sponsor per month.', where: 'Month strip, month page, monthly update' },
  { id: 'topic', title: 'Topic sponsor', body: 'Own a topic such as Payments, Shopify or AI. Your logo sits on that filter and beside its events.', where: 'Topic filter and its listings' },
  { id: 'podcasts', title: 'Podcasts & webinars partner', body: 'Sponsor the directory of shows and online sessions that people follow between events.', where: 'Podcasts page' },
  { id: 'update', title: 'Monthly update sponsor', body: 'One slot in the email that tells subscribers what has been added and changed each month.', where: 'Monthly update email' },
] as const;

export const SPONSOR_RULES = [
  'Sponsored placements are always labelled as sponsored.',
  'Sponsors never change listings, dates, prices or what we say about an event.',
  'One sponsor per slot, so you are never one logo in a crowd.',
];

export const INTERESTS = ['Your events plan', 'Sponsorship & exhibiting advice', 'Featured listing', 'Free event listing', 'Partner event listing (paid)', 'Team access', 'Sponsoring The Events Guy', 'Something else'];

// "List your event" — the organiser offer on the Services page. Free for every approved event; Partner is paid.
// Prices aren't published: Partner is quoted per event. Edit freely.
export const HOST_STEPS = [
  { title: 'Listed in the right month', when: 'Once approved', partner: false, body: 'Your event goes into the guide under its month, tagged by format, topic, area and price, so the ecommerce people searching for exactly that find it.' },
  { title: 'Kept accurate', when: 'Every month', partner: false, body: 'Dates, prices and whether the date is confirmed come straight from you and are re-checked at every monthly refresh. No out-of-date listings.' },
  { title: 'Speaker and judge profiles', when: 'Before the event', partner: false, body: 'Send us your line-up and each speaker or judge gets a profile with their bio and LinkedIn, linking back to your event.' },
  { title: 'Featured to subscribers', when: 'While tickets are on sale', partner: true, body: 'Top of its month with a Featured tag, your own description and a booking link, in front of people who pay to plan their events year.' },
  { title: 'In the monthly update and on the homepage', when: 'The month before', partner: true, body: 'A slot in the email that tells subscribers what’s new, and a place in “Coming up this month” on the homepage.' },
];

export const HOST_TIERS = [
  { feature: 'Listing in the guide, tagged and searchable', free: true, partner: true },
  { feature: 'Dates and prices kept up to date', free: true, partner: true },
  { feature: 'Speaker and judge profiles', free: true, partner: true },
  { feature: 'Awards: entry deadlines, categories and how to enter', free: true, partner: true },
  { feature: 'Featured tag and top-of-month placement', free: false, partner: true },
  { feature: 'Your own description and booking link', free: false, partner: true },
  { feature: 'Monthly update email and homepage slot', free: false, partner: true },
];

export const HOST_FAQ = [
  { q: 'Which events can be listed?', a: 'Ecommerce, retail and digital events and awards in the UK, Ireland and Europe: conferences, expos, meetups, retailer dinners, roundtables, awards and online summits. We approve every listing to keep the guide useful.' },
  { q: 'How quickly does it go live?', a: 'Approved events go in at the next monthly refresh. Partner placements are booked against a month, so the earlier you ask, the more choice you have.' },
  { q: 'What does Partner cost?', a: 'It depends on the month and the size of the event, so we quote each one. Tell us about your event and we’ll come back with a price.' },
  { q: 'Does paying change what you say about my event?', a: 'No. Partner placements are always labelled, and paid or not, every event is listed with the same facts: dates, venue, price and whether the date is confirmed.' },
];

export const HOST_INTERESTS = ['Free listing', 'Partner (paid)'];

// Sponsors shown on the Sponsors page, in order. Add one line per sponsor: put the logo in
// public/partners/ and add `url` once you have their link. `plate` matches the logo's own background. Open slots fill the row up to SPONSOR_SLOTS.
export const SPONSORS: { name: string; logo: string; url?: string; plate?: string }[] = [
  { name: 'Volta', logo: '/partners/volta-logo.png', plate: '#eeebe4' },
  { name: 'Gain Ratio', logo: '/partners/gain-ratio-logo.png', plate: '#efecec' },
  { name: 'The Digital Facilitators', logo: '/partners/digital-facilitators-logo.png', plate: '#f7f7f7' },
];
export const SPONSOR_SLOTS = 4;
