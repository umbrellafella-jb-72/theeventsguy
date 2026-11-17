// Demo accounts for UAT: one click signs you in as a ready-made persona for each role, with
// sample profiles, opportunities, messages and a report so every screen has something on it.
//
// Switched on only when DEMO_ACCOUNTS=true AND the site is still behind the preview gate
// (SITE_PUBLIC is not "true"). Launching the site switches them off automatically: the /demo page
// 404s and any demo session stops working. Demo addresses use the reserved .invalid domain, so no
// email is ever sent to them, and demo members have a made-up Stripe customer that Stripe never sees.
import { addTo, allIn, del, getJSON, members, removeFrom, setJSON, storeReady } from './store';
import { getUser, saveUser, userByEmail, type User } from './users';
import type { Role } from './permissions';
import type { Enquiry, Opportunity, Report, SpeakerProfile, SponsorProfile } from './portal';
import { events, todayKey } from './data';

export const DEMO_DOMAIN = 'demo.theeventsguy.invalid';
export const demoEnabled = () => process.env.DEMO_ACCOUNTS === 'true' && process.env.SITE_PUBLIC !== 'true' && storeReady();
export const isDemoEmail = (e: string | null | undefined) => Boolean(e && e.toLowerCase().endsWith('@' + DEMO_DOMAIN));
export const isDemoCustomer = (c: string | null | undefined) => Boolean(c && c.startsWith('demo_'));

export type PersonaKey = 'free' | 'member' | 'lapsed' | 'organiser' | 'sponsor' | 'speaker' | 'admin';
export type Persona = {
  key: PersonaKey; label: string; name: string; roles: Role[]; plan: 'none' | 'member' | 'lapsed';
  start: string; blurb: string; tryThis: string[];
};

export const PERSONAS: Persona[] = [
  { key: 'free', label: 'Free account', name: 'Fran Free', roles: [], plan: 'none', start: '/guide',
    blurb: 'Signed up, never paid.',
    tryThis: ['Guide shows teasers up to 60 days out, full details locked', 'Save an event to My events', 'Save a search', 'Pricing and checkout prompts'] },
  { key: 'member', label: 'Member (quarterly)', name: 'Morgan Member', roles: [], plan: 'member', start: '/guide',
    blurb: 'Paid member, renews in about 80 days.',
    tryThis: ['Full details from 30 days out', 'Calendar sync and reminders', 'Account shows Member', '“Manage billing” is disabled for demo members'] },
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

async function makeUser(p: Persona): Promise<User> {
  const email = personaEmail(p.key);
  const existing = await userByEmail(email);
  const paid = p.plan === 'member' ? nowS() + 80 * DAY : p.plan === 'lapsed' ? nowS() - 10 * DAY : 0;
  return saveUser({
    id: existing?.id ?? `u_demo_${p.key}`, email, name: p.name,
    roles: ['registered', ...p.roles], status: 'active',
    createdAt: existing?.createdAt ?? iso(30), updatedAt: iso(), lastLogin: existing?.lastLogin ?? null,
    customer: p.plan === 'none' ? null : `demo_cus_${p.key}`, paidUntil: paid,
    saved: existing?.saved ?? [], searches: existing?.searches ?? [], prefs: { newEvents: true, reminders: true },
  });
}

const OPP_LIVE = 'opp_demo_live', OPP_PENDING = 'opp_demo_pending', ENQ = 'enq_demo_1', REP = 'rep_demo_1';

/** Create (or put back to its starting state) every demo account and its sample content. */
export async function seedDemo(): Promise<void> {
  const u = Object.fromEntries(await Promise.all(PERSONAS.map(async p => [p.key, await makeUser(p)] as const))) as Record<PersonaKey, User>;
  const today = todayKey();
  const upcoming = events.filter(e => e.kind === 'event' && e.sortKey >= today).slice(0, 4);
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

  await setJSON(`speaker:${spk.userId}`, spk); await addTo('speakers', spk.userId);
  await setJSON(`sponsor:${spn.userId}`, spn); await addTo('sponsors', spn.userId);
  for (const o of [opp(OPP_LIVE, 'Headline sponsor, Retention Supper (demo)', e1, 'published'), opp(OPP_PENDING, 'Drinks sponsor, Marketplace Meetup (demo)', e2, 'pending')]) {
    await setJSON(`opp:${o.id}`, o); await addTo('opps', o.id);
  }
  await setJSON(`enq:${ENQ}`, enq); await addTo('enquiries', ENQ); await addTo(`inbox:${enq.from}`, ENQ); await addTo(`inbox:${enq.to}`, ENQ);
  await setJSON(`report:${REP}`, rep); await addTo('reports', REP);
  // A starting shortlist so My events isn't empty.
  for (const k of ['free', 'member', 'lapsed'] as const) {
    const x = await getUser(u[k].id); if (x && !x.saved.length) await saveUser({ ...x, saved: upcoming.slice(0, 3).map(e => e.id) });
  }
}

/** Remove every demo account and anything they created (including enquiries and reports made while testing). */
export async function removeDemo(): Promise<number> {
  const ids = new Set<string>();
  for (const p of PERSONAS) { const x = await userByEmail(personaEmail(p.key)); if (x) ids.add(x.id); }
  for (const id of ids) {
    await del(`speaker:${id}`); await removeFrom('speakers', id);
    await del(`sponsor:${id}`); await removeFrom('sponsors', id);
  }
  for (const o of await allIn<Opportunity>('opps', i => `opp:${i}`)) if (ids.has(o.ownerId)) { await del(`opp:${o.id}`); await removeFrom('opps', o.id); }
  for (const e of await allIn<Enquiry>('enquiries', i => `enq:${i}`)) {
    if (ids.has(e.from) || ids.has(e.to)) { await del(`enq:${e.id}`); await removeFrom('enquiries', e.id); await removeFrom(`inbox:${e.from}`, e.id); await removeFrom(`inbox:${e.to}`, e.id); }
  }
  for (const r of await allIn<Report>('reports', i => `report:${i}`)) {
    if ((r.by && ids.has(r.by)) || ids.has(r.target.id)) { await del(`report:${r.id}`); await removeFrom('reports', r.id); }
  }
  for (const id of ids) {
    const x = await getJSON<User>(`user:${id}`);
    await del(`inbox:${id}`); await del(`user:${id}`); await removeFrom('users', id);
    if (x) await del(`user-email:${x.email}`);
  }
  return ids.size;
}

export async function demoUsersExist(): Promise<boolean> {
  const all = await members('users').catch(() => [] as string[]);
  return all.some(id => id.startsWith('u_demo_'));
}
