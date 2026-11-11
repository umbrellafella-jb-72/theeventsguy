// Portal content: speaker and sponsor profiles, sponsorship opportunities, enquiries and reports.
// Profiles and opportunities start "pending" and go public when an admin approves them.
import { addTo, allIn, del, getJSON, newId, removeFrom, setJSON } from './store';
import { getUser, type User } from './users';
import { can } from './permissions';

export type Status = 'pending' | 'published' | 'hidden';

export type SpeakerProfile = {
  userId: string; name: string; headline: string | null; company: string | null; bio: string;
  linkedin: string | null; website: string | null; topics: string[]; events: string[]; // event ids from the guide
  openTo: string[];                // e.g. keynotes, panels, judging, podcasts
  image?: string | null;           // https link to a cartoon portrait (shown once approved)
  status: Status; createdAt: string; updatedAt: string;
};
export type SponsorProfile = {
  userId: string; company: string; website: string | null; about: string; sectors: string[]; interests: string[];
  budget: string | null;           // private: organisers, sponsors and admins only
  contactName: string | null;      // private
  status: Status; createdAt: string; updatedAt: string;
};
export type Opportunity = {
  id: string; ownerId: string; title: string; eventId: string | null; eventName: string | null; when: string | null; city: string | null;
  summary: string;                 // public
  packages: string | null;         // private: what's on offer in detail
  budget: string | null;           // private
  contact: string | null;          // private
  deadline: string | null; audience: string | null; sectors: string[];
  status: Status; createdAt: string; updatedAt: string;
};
export type Message = { from: string; body: string; at: string };
export type Enquiry = {
  id: string; from: string; to: string; subject: string;
  about: { type: 'opportunity' | 'speaker' | 'sponsor'; id: string; label: string };
  messages: Message[]; status: 'open' | 'closed'; unreadBy: string[]; createdAt: string; updatedAt: string;
};
export type Report = { id: string; by: string | null; target: { type: 'speaker' | 'sponsor' | 'opportunity' | 'user'; id: string; label: string }; reason: string; status: 'open' | 'resolved'; createdAt: string };

const K = {
  speaker: (id: string) => `speaker:${id}`, sponsor: (id: string) => `sponsor:${id}`, opp: (id: string) => `opp:${id}`,
  enquiry: (id: string) => `enq:${id}`, report: (id: string) => `report:${id}`,
};
const now = () => new Date().toISOString();
export const list = (s: string) => s.split(/[;,\n]/).map(t => t.trim()).filter(Boolean);
export const cleanUrl = (u: string) => { const s = u.trim(); if (!s || /\s/.test(s) || !s.includes('.')) return null; return /^https?:\/\//i.test(s) ? s : `https://${s}`; };
export const isLinkedIn = (u: string | null) => !!u && /^https:\/\/(www\.|[a-z]{2}\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9_%.-]+\/?$/.test(u);

// ---------- Speaker profiles ----------
export const getSpeaker = (id: string) => getJSON<SpeakerProfile>(K.speaker(id));
export async function saveSpeaker(p: SpeakerProfile, resubmit: boolean) {
  const next = { ...p, status: resubmit && p.status !== 'hidden' ? 'pending' as Status : p.status, updatedAt: now() };
  await setJSON(K.speaker(p.userId), next); await addTo('speakers', p.userId); return next;
}
export const allSpeakers = () => allIn<SpeakerProfile>('speakers', K.speaker);

// ---------- Sponsor profiles ----------
export const getSponsor = (id: string) => getJSON<SponsorProfile>(K.sponsor(id));
export async function saveSponsor(p: SponsorProfile, resubmit: boolean) {
  const next = { ...p, status: resubmit && p.status !== 'hidden' ? 'pending' as Status : p.status, updatedAt: now() };
  await setJSON(K.sponsor(p.userId), next); await addTo('sponsors', p.userId); return next;
}
export const allSponsors = () => allIn<SponsorProfile>('sponsors', K.sponsor);

// ---------- Opportunities ----------
export const getOpp = (id: string) => getJSON<Opportunity>(K.opp(id));
export async function saveOpp(o: Opportunity, resubmit: boolean) {
  const next = { ...o, status: resubmit && o.status !== 'hidden' ? 'pending' as Status : o.status, updatedAt: now() };
  await setJSON(K.opp(o.id), next); await addTo('opps', o.id); return next;
}
export const allOpps = () => allIn<Opportunity>('opps', K.opp);
export const newOppId = () => newId('opp');

/** What a viewer may see of an opportunity: the summary is public; budget, packages and contact
 *  only for organisers, sponsors, admins and the person who posted it. */
export function oppFor(o: Opportunity, viewer: User | null): Opportunity & { locked: boolean } {
  const full = Boolean(viewer && (viewer.id === o.ownerId || can(viewer, 'opportunity.seeDetails')));
  return full ? { ...o, locked: false } : { ...o, packages: null, budget: null, contact: null, locked: true };
}
export function sponsorFor(p: SponsorProfile, viewer: User | null): SponsorProfile & { locked: boolean } {
  const full = Boolean(viewer && (viewer.id === p.userId || can(viewer, 'opportunity.seeDetails') || can(viewer, 'directory.sponsors')));
  return full ? { ...p, locked: false } : { ...p, budget: null, contactName: null, locked: true };
}

// ---------- Moderation ----------
export async function setStatus(type: 'speaker' | 'sponsor' | 'opportunity', id: string, status: Status) {
  const key = type === 'speaker' ? K.speaker(id) : type === 'sponsor' ? K.sponsor(id) : K.opp(id);
  const d = await getJSON<{ status: Status }>(key); if (!d) return;
  await setJSON(key, { ...d, status, updatedAt: now() });
}
export async function removeContent(type: 'speaker' | 'sponsor' | 'opportunity', id: string) {
  if (type === 'speaker') { await del(K.speaker(id)); await removeFrom('speakers', id); }
  else if (type === 'sponsor') { await del(K.sponsor(id)); await removeFrom('sponsors', id); }
  else { await del(K.opp(id)); await removeFrom('opps', id); }
}

// ---------- Enquiries ----------
export const getEnquiry = (id: string) => getJSON<Enquiry>(K.enquiry(id));
export async function createEnquiry(e: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'unreadBy'>) {
  const enq: Enquiry = { ...e, id: newId('enq'), status: 'open', unreadBy: [e.to], createdAt: now(), updatedAt: now() };
  await setJSON(K.enquiry(enq.id), enq); await addTo('enquiries', enq.id);
  await addTo(`inbox:${e.to}`, enq.id); await addTo(`inbox:${e.from}`, enq.id);
  return enq;
}
export async function replyEnquiry(enq: Enquiry, from: string, body: string) {
  const other = from === enq.from ? enq.to : enq.from;
  const next: Enquiry = { ...enq, messages: [...enq.messages, { from, body, at: now() }], unreadBy: [...new Set([...enq.unreadBy.filter(x => x !== from), other])], updatedAt: now() };
  await setJSON(K.enquiry(enq.id), next); return next;
}
export async function markRead(enq: Enquiry, userId: string) {
  if (!enq.unreadBy.includes(userId)) return enq;
  const next = { ...enq, unreadBy: enq.unreadBy.filter(x => x !== userId) }; await setJSON(K.enquiry(enq.id), next); return next;
}
export async function inbox(userId: string) {
  return (await allIn<Enquiry>(`inbox:${userId}`, K.enquiry)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export const allEnquiries = () => allIn<Enquiry>('enquiries', K.enquiry);

// ---------- Reports ----------
export async function createReport(r: Omit<Report, 'id' | 'createdAt' | 'status'>) {
  const rep: Report = { ...r, id: newId('rep'), status: 'open', createdAt: now() };
  await setJSON(K.report(rep.id), rep); await addTo('reports', rep.id); return rep;
}
export async function resolveReport(id: string) { const r = await getJSON<Report>(K.report(id)); if (r) await setJSON(K.report(id), { ...r, status: 'resolved' }); }
export const allReports = () => allIn<Report>('reports', K.report);

/** Display names for a set of user ids (company for sponsors, name for speakers, else email name). */
export async function namesFor(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of [...new Set(ids)]) {
    const [u, sp, so] = await Promise.all([getUser(id), getSpeaker(id), getSponsor(id)]);
    out[id] = so?.company || sp?.name || u?.name || (u ? u.email.split('@')[0] : 'Former user');
  }
  return out;
}
