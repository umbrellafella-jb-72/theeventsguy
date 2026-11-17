// Demo accounts for UAT: one click signs you in as a ready-made persona for each role, with
// sample profiles, opportunities, messages and a report so every screen has something on it.
//
// Switched on only when DEMO_ACCOUNTS=true AND the site is still behind the preview gate
// (SITE_PUBLIC is not "true"). Launching the site switches them off automatically: the /demo page
// 404s and any demo session stops working. Demo addresses use the reserved .invalid domain, so no
// email is ever sent to them, and demo members have a made-up Stripe customer that Stripe never sees.
import { allIn, members, pipeline, storeReady } from './store';
import type { User } from './users';
import type { Role } from './permissions';
import type { Enquiry, Opportunity, Report, SpeakerProfile, SponsorProfile } from './portal';
import { events, todayKey } from './data';

export const DEMO_DOMAIN = 'demo.theeventsguy.invalid';
export const demoFlag = () => (process.env.DEMO_ACCOUNTS || '').trim().replace(/^["']|["']$/g, '').toLowerCase() === 'true';
export const sitePublic = () => process.env.SITE_PUBLIC === 'true';
export const demoEnabled = () => demoFlag() && !sitePublic() && storeReady();
/** Why demo mode is off, for the /demo page while the site is still gated (never shown once public). */
export function demoProblems(): string[] {
  const out: string[] = [];
  if (!demoFlag()) out.push(`DEMO_ACCOUNTS isn't set to true for this deployment (it reads ${process.env.DEMO_ACCOUNTS === undefined ? 'as missing' : 'as something else'}). Add it under Settings → Environment Variables for the environment this address uses, then redeploy.`);
  if (!storeReady()) out.push('The Upstash Redis store isn\'t connected (KV_REST_API_URL and KV_REST_API_TOKEN), so accounts can\'t be saved.');
  return out;
}
export const isDemoEmail = (e: string | null | undefined) => Boolean(e && e.toLowerCase().endsWith('@' + DEMO_DOMAIN));
export const isDemoCustomer = (c: string | null | undefined) => Boolean(c && c.startsWith('demo_'));

export type PersonaKey = 'free' | 'member' | 'yearly' | 'lapsed' | 'organiser' | 'sponsor' | 'speaker' | 'admin';
export type Persona = {
  key: PersonaKey; label: string; name: string; roles: Role[]; plan: 'none' | 'quarterly' | 'yearly' | 'lapsed';
  start: string; blurb: string; tryThis: string[];
};

export const PERSONAS: Persona[] = [
  { key: 'free', label: 'Free account', name: 'Fran Free', roles: [], plan: 'none', start: '/guide',
    blurb: 'Signed up, never paid.',
    tryThis: ['Guide shows teasers up to 30 days out, full details locked', 'Save an event to My events', 'Save a search', 'Pricing and checkout prompts'] },
  { key: 'member', label: 'Member (quarterly)', name: 'Morgan Member', roles: [], plan: 'quarterly', start: '/guide',
    blurb: 'Quarterly member who joined this calendar quarter.',
    tryThis: ['Every event in this quarter open in full', 'After the quarter: listings 30 days out only', 'Calendar sync and reminders', '“Manage billing” is disabled for demo members'] },
  { key: 'yearly', label: 'Member (yearly)', name: 'Yan Yearly', roles: [], plan: 'yearly', start: '/guide',
    blurb: 'Yearly member on the rolling release.',
    tryThis: ['Full details from 30 days out', 'Listings 60 days out', 'Not limited to a quarter'] },
  { key: 'lapsed', label: 'Lapsed member', name: 'Lee Lapsed', roles: [], plan: 'lapsed', start: '/account',
    blurb: 'Membership ended 10 days ago.',
    tryThis: ['Back to free-account views', 'Renewal prompts', 'Shortlist kept'] },
  { key: 'organiser', label: 'Organiser', name: 'Olivia Organiser', roles: ['organiser'], plan: 'none', start: '/portal/opportunities',
    blurb: 'Runs an event and sells sponsorship.',
    tryThis: ['Post or edit an opportunity', 'Reply to the sponsor’s enquiry in Messages', 'Find sponsors (budgets visible)', 'Find speakers and send an enquiry'] },
  { key: 'sponsor', label: 'Sponsor', name: 'Sam Sponsor', roles: ['sponsor'], plan: 'none', start: '/opportunities',
    blurb: 'A payments brand looking for events to back.',
    tryThis: ['Opportunity budgets and contacts visible', 'Send an organiser an enquiry', 'Edit the sponsor profile', 'Cannot search the sponsor directory'] },
  { key: 'speaker', label: 'Speaker', name: 'Sasha Speaker', roles: ['speaker'], plan: 'none', start: '/portal/speaker',
    blurb: 'Published speaker profile.',
    tryThis: ['Edit the profile (goes back to pending)', 'Receives and answers enquiries', 'Cannot send enquiries or see budgets'] },
  { key: 'admin', label: 'Admin', name: 'Ada Admin', roles: ['admin'], plan: 'none', start: '/admin?tab=queue',
    blurb: 'Moderates everything.',
    tryThis: ['Approve the pending opportunity', 'Resolve the open report', 'Suspend and restore a user', 'Leads and reporting tabs'] },
];

export const personaEmail = (k: PersonaKey) => `${k}@${DEMO_DOMAIN}`;
export const personaFor = (email: string | null | undefined) => PERSONAS.find(p => personaEmail(p.key) === email?.toLowerCase()) ?? null;

const DAY = 86400;
const nowS = () => Math.floor(Date.now() / 1000);
const iso = (daysAgo = 0) => new Date(Date.now() - daysAgo * DAY * 1000).toISOString();

const demoId = (k: PersonaKey) => `u_demo_${k}`;
const DEMO_IDS = () => PERSONAS.map(p => demoId(p.key));

/** A persona's account in its starting state. */
function makeUser(p: Persona, saved: string[]): User {
  const paid = p.plan === 'quarterly' ? nowS() + 80 * DAY : p.plan === 'yearly' ? nowS() + 300 * DAY : p.plan === 'lapsed' ? nowS() - 10 * DAY : 0;
  return {
    id: demoId(p.key), email: personaEmail(p.key), name: p.name,
    roles: ['registered', ...p.roles], status: 'active',
    createdAt: iso(30), updatedAt: iso(), lastLogin: null,
    customer: p.plan === 'none' ? null : `demo_cus_${p.key}`, paidUntil: paid,
    plan: p.plan === 'yearly' ? 'yearly' : p.plan === 'none' ? null : 'quarterly', periodStart: p.plan === 'none' ? null : nowS() - 10 * DAY,
    saved: ['free', 'member', 'yearly', 'lapsed'].includes(p.key) ? saved : [], searches: [], prefs: { newEvents: true, reminders: true },
  };
}

const OPP_LIVE = 'opp_demo_live', OPP_PENDING = 'opp_demo_pending', ENQ = 'enq_demo_1', REP = 'rep_demo_1';

/** Create (or put back to its starting state) every demo account and its sample content. */
export async function seedDemo(): Promise<void> {
  // Start clean, so a reset also clears anything made while testing.
  await removeDemo();
  const today = todayKey();
  const upcoming = events.filter(e => e.kind === 'event' && e.sortKey >= today).slice(0, 4);
  const u = Object.fromEntries(PERSONAS.map(p => [p.key, makeUser(p, upcoming.slice(0, 3).map(e => e.id))])) as Record<PersonaKey, User>;
  const [e1, e2] = upcoming;

  const spk: SpeakerProfile = {
    userId: u.speaker.id, name: 'Sasha Speaker (demo)', headline: 'Head of Ecommerce, Demo Retail Co', company: 'Demo Retail Co',
    bio: 'Demo profile for testing. Talks about retention, marketplaces and getting more from first-party data.',
    linkedin: null, website: null, topics: ['Retention', 'Marketplaces', 'First-party data'], events: upcoming.slice(0, 2).map(e => e.id),
    openTo: ['Keynotes', 'Panels', 'Judging'], image: null, status: 'published', createdAt: iso(20), updatedAt: iso(20),
  };
  const spn: SponsorProfile = {
    userId: u.sponsor.id, company: 'Demo Payments Ltd', website: null, about: 'Demo sponsor profile. Checkout and payments for fashion and beauty brands.',
    sectors: ['Fashion & beauty'], interests: ['Dinners', 'Headline sponsorship'], budget: 'DEMO budget £5k–£15k per event', contactName: 'Sam Sponsor',
    status: 'published', createdAt: iso(18), updatedAt: iso(18),
  };
  const opp = (id: string, title: string, e: typeof e1 | undefined, status: Opportunity['status']): Opportunity => ({
    id, ownerId: u.organiser.id, title, eventId: e?.id ?? null, eventName: e?.name ?? null, when: e?.dates ?? null, city: e?.city ?? null,
    summary: 'Demo opportunity. Forty heads of ecommerce around one table, with a short talk from the sponsor.',
    packages: 'Headline £4,000 · Drinks £1,500 · Goody bag £500', budget: 'DEMO £1,500–£4,000', contact: 'Olivia Organiser (demo)',
    deadline: null, audience: 'Heads of ecommerce and digital, UK retail', sectors: ['Fashion & beauty', 'Home'],
    status, createdAt: iso(status === 'pending' ? 1 : 14), updatedAt: iso(status === 'pending' ? 1 : 14),
  });
  const enq: Enquiry = {
    id: ENQ, from: u.sponsor.id, to: u.organiser.id, subject: 'Headline sponsorship', about: { type: 'opportunity', id: OPP_LIVE, label: 'Headline sponsor, Retention Supper (demo)' },
    messages: [
      { from: u.sponsor.id, body: 'Hi Olivia, we’d like to talk about the headline package. Is it still available?', at: iso(3) },
      { from: u.organiser.id, body: 'It is. Could you do a call on Tuesday?', at: iso(2) },
      { from: u.sponsor.id, body: 'Tuesday works. 10am?', at: iso(1) },
    ],
    status: 'open', unreadBy: [u.organiser.id], createdAt: iso(3), updatedAt: iso(1),
  };
  const rep: Report = { id: REP, by: u.free.id, target: { type: 'speaker', id: u.speaker.id, label: spk.name }, reason: 'Demo report: link in bio looks wrong.', status: 'open', createdAt: iso(1) };

  const J = (v: unknown) => JSON.stringify(v);
  const cmds: (string | number)[][] = [];
  for (const x of Object.values(u)) cmds.push(['SET', `user:${x.id}`, J(x)], ['SET', `user-email:${x.email}`, x.id], ['SADD', 'users', x.id]);
  cmds.push(['SET', `speaker:${spk.userId}`, J(spk)], ['SADD', 'speakers', spk.userId]);
  cmds.push(['SET', `sponsor:${spn.userId}`, J(spn)], ['SADD', 'sponsors', spn.userId]);
  for (const o of [opp(OPP_LIVE, 'Headline sponsor, Retention Supper (demo)', e1, 'published'), opp(OPP_PENDING, 'Drinks sponsor, Marketplace Meetup (demo)', e2, 'pending')]) {
    cmds.push(['SET', `opp:${o.id}`, J(o)], ['SADD', 'opps', o.id]);
  }
  cmds.push(['SET', `enq:${ENQ}`, J(enq)], ['SADD', 'enquiries', ENQ], ['SADD', `inbox:${enq.from}`, ENQ], ['SADD', `inbox:${enq.to}`, ENQ]);
  cmds.push(['SET', `report:${REP}`, J(rep)], ['SADD', 'reports', REP]);
  await pipeline(cmds);
}

/** Remove every demo account and anything they created (including enquiries and reports made while testing). */
export async function removeDemo(): Promise<number> {
  const ids = new Set(DEMO_IDS());
  const [opps, enqs, reps, present] = await Promise.all([
    allIn<Opportunity>('opps', i => `opp:${i}`), allIn<Enquiry>('enquiries', i => `enq:${i}`), allIn<Report>('reports', i => `report:${i}`),
    members('users'),
  ]);
  const cmds: (string | number)[][] = [];
  for (const id of ids) {
    cmds.push(['DEL', `speaker:${id}`, `sponsor:${id}`, `inbox:${id}`, `user:${id}`], ['SREM', 'speakers', id], ['SREM', 'sponsors', id], ['SREM', 'users', id]);
  }
  for (const p of PERSONAS) cmds.push(['DEL', `user-email:${personaEmail(p.key)}`]);
  for (const o of opps) if (ids.has(o.ownerId)) cmds.push(['DEL', `opp:${o.id}`], ['SREM', 'opps', o.id]);
  for (const e of enqs) if (ids.has(e.from) || ids.has(e.to)) cmds.push(['DEL', `enq:${e.id}`], ['SREM', 'enquiries', e.id], ['SREM', `inbox:${e.from}`, e.id], ['SREM', `inbox:${e.to}`, e.id]);
  for (const r of reps) if ((r.by && ids.has(r.by)) || ids.has(r.target.id)) cmds.push(['DEL', `report:${r.id}`], ['SREM', 'reports', r.id]);
  await pipeline(cmds);
  return present.filter(id => ids.has(id)).length;
}

export async function demoUsersExist(): Promise<boolean> {
  const all = await members('users').catch(() => [] as string[]);
  return all.some(id => id.startsWith('u_demo_'));
}
