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

export const INTERESTS = ['Your events plan', 'Sponsorship & exhibiting advice', 'Featured listing', 'Team access', 'Sponsoring The Events Guy', 'Something else'];
