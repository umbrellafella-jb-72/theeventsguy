'use server';

import { redirect } from 'next/navigation';
import { can, type Role } from '@/lib/permissions';
import { getUser, saveUser, sessionUser, type User } from '@/lib/users';
import {
  cleanUrl, createEnquiry, createReport, getEnquiry, getOpp, getSpeaker, getSponsor, isLinkedIn, list, newOppId, removeContent,
  replyEnquiry, resolveReport, saveOpp, saveSpeaker, saveSponsor, setStatus, type Opportunity, type SpeakerProfile, type SponsorProfile,
} from '@/lib/portal';
import { eventById, eventIdFrom } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { siteUrl } from '@/lib/stripe';
import { newId, safePath, tooMany } from '@/lib/store';
import { headers } from 'next/headers';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
async function me(next = '/account'): Promise<User> {
  const u = await sessionUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}
/** The account being edited: your own, or (admins only) the one named in the form. */
async function target(f: FormData, u: User): Promise<User> {
  const as = str(f, 'as', 60);
  if (as && as !== u.id) { if (!can(u, 'content.moderate')) redirect('/account'); const t = await getUser(as); if (!t) redirect('/admin'); return t; }
  return u;
}

// ---------- Roles (self-serve: organiser, sponsor, speaker) ----------
const SELF: Role[] = ['organiser', 'sponsor', 'speaker'];
export async function toggleRole(f: FormData) {
  const u = await me();
  const role = str(f, 'role', 20) as Role;
  if (!SELF.includes(role)) redirect('/account');
  const roles = u.roles.includes(role) ? u.roles.filter(r => r !== role) : [...u.roles, role];
  await saveUser({ ...u, roles });
  redirect(`/account?role=${role}`);
}

// ---------- Profiles ----------
export async function saveSpeakerProfile(f: FormData) {
  const u = await me('/portal/speaker');
  const t = await target(f, u);
  if (!can(t, 'speakerProfile.publish') && !can(u, 'content.moderate')) redirect('/account');
  const prev = await getSpeaker(t.id);
  const li = cleanUrl(str(f, 'linkedin', 300));
  const p: SpeakerProfile = {
    userId: t.id, name: str(f, 'name', 80) || t.name || t.email.split('@')[0], headline: str(f, 'headline', 120) || null, company: str(f, 'company', 120) || null,
    bio: str(f, 'bio', 1200), linkedin: isLinkedIn(li) ? li : null, website: cleanUrl(str(f, 'website', 300)),
    topics: list(str(f, 'topics', 400)).slice(0, 12), events: [...new Set(f.getAll('events').map(v => eventIdFrom(String(v))).filter((x): x is string => !!x))].slice(0, 20),
    openTo: f.getAll('openTo').map(String).slice(0, 6),
    image: (u => (u && /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : null))(cleanUrl(str(f, 'image', 500))),
    status: prev?.status ?? 'pending', createdAt: prev?.createdAt ?? new Date().toISOString(), updatedAt: '',
  };
  // Admin edits keep the current status; an owner's edit goes back for approval.
  await saveSpeaker(p, t.id === u.id && !can(u, 'content.moderate'));
  redirect(t.id === u.id ? '/portal/speaker?saved=1' : `/portal/speaker?as=${t.id}&saved=1`);
}

export async function saveSponsorProfile(f: FormData) {
  const u = await me('/portal/sponsor');
  const t = await target(f, u);
  if (!can(t, 'sponsorProfile.publish') && !can(u, 'content.moderate')) redirect('/account');
  const prev = await getSponsor(t.id);
  const p: SponsorProfile = {
    userId: t.id, company: str(f, 'company', 120) || 'Unnamed company', website: cleanUrl(str(f, 'website', 300)), about: str(f, 'about', 1200),
    sectors: f.getAll('sectors').map(String).slice(0, 8), interests: list(str(f, 'interests', 400)).slice(0, 12),
    budget: str(f, 'budget', 120) || null, contactName: str(f, 'contactName', 120) || null,
    status: prev?.status ?? 'pending', createdAt: prev?.createdAt ?? new Date().toISOString(), updatedAt: '',
  };
  await saveSponsor(p, t.id === u.id && !can(u, 'content.moderate'));
  redirect(t.id === u.id ? '/portal/sponsor?saved=1' : `/portal/sponsor?as=${t.id}&saved=1`);
}

// ---------- Sponsorship opportunities ----------
export async function saveOpportunity(f: FormData) {
  const u = await me('/portal/opportunities');
  const id = str(f, 'id', 60);
  const prev = id ? await getOpp(id) : null;
  const admin = can(u, 'content.moderate');
  if (prev ? prev.ownerId !== u.id && !admin : !can(u, 'opportunity.post')) redirect('/account');
  const ev = eventById.get(eventIdFrom(str(f, 'eventId', 300)) ?? '') ?? null;
  const o: Opportunity = {
    id: prev?.id ?? newOppId(), ownerId: prev?.ownerId ?? u.id, title: str(f, 'title', 120) || 'Sponsorship opportunity',
    eventId: ev?.id ?? null, eventName: ev?.name ?? (str(f, 'eventName', 120) || null), when: ev?.dates ?? (str(f, 'when', 80) || null), city: ev?.city ?? (str(f, 'city', 80) || null),
    summary: str(f, 'summary', 600), packages: str(f, 'packages', 2000) || null, budget: str(f, 'budget', 120) || null, contact: str(f, 'contact', 200) || null,
    deadline: str(f, 'deadline', 20) || null, audience: str(f, 'audience', 300) || null, sectors: f.getAll('sectors').map(String).slice(0, 8),
    status: prev?.status ?? 'pending', createdAt: prev?.createdAt ?? new Date().toISOString(), updatedAt: '',
  };
  await saveOpp(o, !admin);
  redirect(`/portal/opportunities?saved=${o.id}`);
}

export async function deleteOpportunity(f: FormData) {
  const u = await me('/portal/opportunities');
  const o = await getOpp(str(f, 'id', 60));
  if (o && (o.ownerId === u.id || can(u, 'content.moderate'))) await removeContent('opportunity', o.id);
  redirect('/portal/opportunities?deleted=1');
}

// ---------- Enquiries ----------
// Organisers enquire to speakers and sponsors; sponsors (and organisers) to opportunities.
// Speakers receive and answer. Every message also goes by email to the other person.
export async function sendEnquiry(f: FormData) {
  const type = str(f, 'type', 20) as 'speaker' | 'sponsor' | 'opportunity';
  const id = str(f, 'id', 60);
  const u = await me(`/portal/enquire?type=${type}&id=${id}`);
  if (!can(u, 'enquiry.send')) redirect('/account?need=enquiry');
  let to: string | null = null, label = '';
  if (type === 'speaker' && can(u, 'directory.speakers')) { const p = await getSpeaker(id); if (p?.status === 'published') { to = p.userId; label = p.name; } }
  if (type === 'sponsor' && can(u, 'directory.sponsors')) { const p = await getSponsor(id); if (p?.status === 'published') { to = p.userId; label = p.company; } }
  if (type === 'opportunity' && can(u, 'opportunity.seeDetails')) { const o = await getOpp(id); if (o?.status === 'published') { to = o.ownerId; label = o.title; } }
  const body = str(f, 'message', 3000);
  if (await tooMany(`enquiry:${u.id}`, 20, 86400)) redirect(`/portal/enquire?type=${type}&id=${id}&error=slow`);
  if (!to || to === u.id || !body) redirect(`/portal/enquire?type=${type}&id=${id}&error=1`);
  const enq = await createEnquiry({ from: u.id, to, subject: str(f, 'subject', 140) || `About: ${label}`, about: { type, id, label }, messages: [{ from: u.id, body, at: new Date().toISOString() }] });
  await notify(to, enq.subject, enq.id);
  redirect(`/portal/inbox?e=${enq.id}&sent=1`);
}

export async function replyToEnquiry(f: FormData) {
  const u = await me('/portal/inbox');
  const enq = await getEnquiry(str(f, 'id', 60));
  const body = str(f, 'message', 3000);
  if (!enq || ![enq.from, enq.to].includes(u.id) || !can(u, 'enquiry.receive') && enq.from !== u.id || !body) redirect('/portal/inbox');
  await replyEnquiry(enq, u.id, body);
  await notify(u.id === enq.from ? enq.to : enq.from, `Re: ${enq.subject}`, enq.id);
  redirect(`/portal/inbox?e=${enq.id}`);
}

async function notify(userId: string, subject: string, enqId: string) {
  const r = await getUser(userId);
  if (!r) return;
  const link = `${siteUrl()}/portal/inbox?e=${enqId}`;
  await sendEmail({ to: r.email, subject: `New message on The Events Guy: ${subject}`, text: `You have a new message on The Events Guy.\n\n${subject}\n\nRead and reply: ${link}\n\nWe don't share your email address — replies go through The Events Guy.` });
}

// ---------- Reports (anyone, signed in or not) ----------
export async function reportContent(f: FormData) {
  const u = await sessionUser();
  const h = await headers();
  // At most 10 reports an hour from one person or IP address, so the admin queue can't be flooded.
  if (await tooMany(`report:${u?.id ?? (h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0] || 'unknown')}`, 10, 3600)) redirect('/?reported=1');
  const type = str(f, 'type', 20) as 'speaker' | 'sponsor' | 'opportunity' | 'user';
  if (!['speaker', 'sponsor', 'opportunity', 'user'].includes(type)) redirect('/');
  await createReport({ by: u?.id ?? null, target: { type, id: str(f, 'id', 60), label: str(f, 'label', 140) }, reason: str(f, 'reason', 1000) || 'No reason given' });
  const back = safePath(str(f, 'back', 200), '/');
  redirect(`${back}${back.includes('?') ? '&' : '?'}reported=1`);
}

// ---------- Saved searches ----------
export async function saveSearch(f: FormData) {
  const u = await me('/guide');
  if (!can(u, 'search.save')) redirect('/account');
  const query = str(f, 'query', 1500).replace(/^\?/, '');
  const name = str(f, 'name', 80) || 'My search';
  await saveUser({ ...u, searches: [{ id: newId('s'), name, query, createdAt: new Date().toISOString() }, ...u.searches].slice(0, 25) });
  redirect(`/guide?${query}${query ? '&' : ''}savedSearch=1`);
}
export async function deleteSearch(f: FormData) {
  const u = await me();
  await saveUser({ ...u, searches: u.searches.filter(s => s.id !== str(f, 'id', 60)) });
  redirect('/account#searches');
}

// ---------- Admin ----------
async function admin(p: 'content.moderate' | 'users.manage' | 'reports.manage') {
  const u = await me('/admin');
  if (!can(u, p)) redirect('/account');
  return u;
}
export async function moderate(f: FormData) {
  await admin('content.moderate');
  const type = str(f, 'type', 20) as 'speaker' | 'sponsor' | 'opportunity';
  const id = str(f, 'id', 60), action = str(f, 'action', 20);
  if (action === 'approve') await setStatus(type, id, 'published');
  else if (action === 'hide') await setStatus(type, id, 'hidden');
  else if (action === 'remove') await removeContent(type, id);
  redirect(`/admin?tab=${str(f, 'tab', 20) || 'queue'}&done=${action}`);
}
export async function manageUser(f: FormData) {
  const a = await admin('users.manage');
  const t = await getUser(str(f, 'id', 60));
  if (!t) redirect('/admin?tab=users');
  const action = str(f, 'action', 20);
  if (action === 'roles') {
    const roles = (['organiser', 'sponsor', 'speaker', 'admin'] as Role[]).filter(r => f.get(`role_${r}`) === 'on');
    // An admin can't remove their own admin role (so the site always keeps one).
    if (t.id === a.id && !roles.includes('admin')) roles.push('admin');
    await saveUser({ ...t, roles: ['registered', ...roles] });
  } else if (action === 'suspend' && t.id !== a.id) await saveUser({ ...t, status: 'suspended' });
  else if (action === 'restore') await saveUser({ ...t, status: 'active' });
  redirect(`/admin?tab=users&q=${encodeURIComponent(str(f, 'q', 100))}&done=${action}`);
}
export async function closeReport(f: FormData) {
  await admin('reports.manage');
  await resolveReport(str(f, 'id', 60));
  redirect('/admin?tab=reports&done=resolved');
}
