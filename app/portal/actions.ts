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
import { LEAD_STATUSES, updateLead, type LeadStatus } from '@/lib/leads';
import { headers } from 'next/headers';
import { fetchLinkedIn, normaliseLinkedIn, type LinkedInPreview } from '@/lib/linkedin';
import { deletePhoto, hasPhoto, isStoredPhoto, photoPath, restylePhoto, storePhoto, storePhotoFromUrl, type PhotoStyle } from '@/lib/photos';
import { MANAGED_SPEAKER_DOMAIN, speakerByLinkedIn } from '@/lib/portal';
import { ensureUser } from '@/lib/users';

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
  const isAdmin = can(u, 'content.moderate');
  const back = (q: string) => (t.id === u.id ? `/portal/speaker?${q}` : `/portal/speaker?as=${t.id}&${q}`);
  const li = normaliseLinkedIn(str(f, 'linkedin', 300)) ?? cleanUrl(str(f, 'linkedin', 300));

  // "Fill from LinkedIn": read the public preview and fill whatever is blank (and the photo).
  let filled: LinkedInPreview | null = null;
  if (f.get('fill') === '1') {
    if (!li || !isLinkedIn(li)) redirect(back('li=bad'));
    if (await tooMany(`li:${u.id}`, 20, 3600)) redirect(back('li=busy'));
    filled = await fetchLinkedIn(li);
  }
  const pick = (k: string, max: number, from?: string) => str(f, k, max) || (from ? from.slice(0, max) : '');

  // Photo: a new upload, or the one LinkedIn shared; shown only with the speaker's agreement.
  const style: PhotoStyle = f.get('photoStyle') === 'on' ? 'guy' : 'photo';
  let photoStored = await hasPhoto(t.id);
  let fresh = false;
  const file = f.get('photo');
  if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as File).size > 0) {
    if ((file as File).size > 5_000_000 || !/^image\//.test((file as File).type)) redirect(back('photo=bad'));
    if (!(await storePhoto(t.id, Buffer.from(await (file as File).arrayBuffer()), style))) redirect(back('photo=bad'));
    photoStored = true; fresh = true;
  }
  if (filled?.photo && await storePhotoFromUrl(t.id, filled.photo, style)) { photoStored = true; fresh = true; }
  if (photoStored && !fresh && style !== (prev?.photoStyle ?? 'photo')) await restylePhoto(t.id, style);
  if (f.get('removePhoto') === 'on') { await deletePhoto(t.id); photoStored = false; }
  const consent = f.get('photoConsent') === 'on';
  const cartoon = (x => (x && /^https:\/\/[^\s"'<>]+$/i.test(x) ? x : null))(cleanUrl(str(f, 'image', 500)));
  // A stored photo wins when agreed; otherwise a cartoon portrait link, if one was given.
  const image = consent && photoStored ? photoPath(t.id) : cartoon && !isStoredPhoto(cartoon, t.id) ? cartoon : null;

  const p: SpeakerProfile = {
    userId: t.id, name: pick('name', 80, filled?.name) || t.name || t.email.split('@')[0],
    headline: pick('headline', 120, filled?.headline) || null, company: pick('company', 120, filled?.company) || null,
    bio: pick('bio', 1200, filled?.about), linkedin: li && isLinkedIn(li) ? li : null, website: cleanUrl(str(f, 'website', 300)),
    topics: list(str(f, 'topics', 400)).slice(0, 12), events: [...new Set(f.getAll('events').map(v => eventIdFrom(String(v))).filter((x): x is string => !!x))].slice(0, 20),
    openTo: f.getAll('openTo').map(String).slice(0, 6),
    image, photoConsent: consent && photoStored, photoStyle: style, managed: prev?.managed ?? t.email.endsWith('@' + MANAGED_SPEAKER_DOMAIN),
    status: isAdmin && ['published', 'hidden', 'pending'].includes(str(f, 'visibility', 20)) ? str(f, 'visibility', 20) as SpeakerProfile['status'] : prev?.status ?? 'pending', createdAt: prev?.createdAt ?? new Date().toISOString(), updatedAt: '',
  };
  // Admin edits keep the current status (or publish it); an owner's edit goes back for approval.
  await saveSpeaker(p, t.id === u.id && !isAdmin);
  if (filled) {
    const got = (['name', 'headline', 'company', 'about', 'photo'] as const).filter(k => filled![k]);
    redirect(back(filled.ok ? `li=ok&got=${got.join(',')}` : `li=none&why=${encodeURIComponent(filled.reason ?? '')}`));
  }
  redirect(back('saved=1'));
}

/** Admin: add a speaker from a LinkedIn link. Makes a sign-in-less speaker account, fills what
 *  LinkedIn shares, then opens the profile for the admin to check and publish. */
export async function addSpeakerFromLinkedIn(f: FormData) {
  const a = await admin('content.moderate');
  const li = normaliseLinkedIn(str(f, 'linkedin', 300));
  if (!li) redirect('/admin?tab=speakers&li=bad');
  const existing = await speakerByLinkedIn(li);
  if (existing) redirect(`/portal/speaker?as=${existing.userId}&li=exists`);
  if (await tooMany(`li:${a.id}`, 20, 3600)) redirect('/admin?tab=speakers&li=busy');
  const handle = li.split('/in/')[1].replace(/\/$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || newId('s');
  const t = await ensureUser(`${handle}@${MANAGED_SPEAKER_DOMAIN}`, { name: null });
  if (!t.roles.includes('speaker')) await saveUser({ ...t, roles: [...t.roles, 'speaker'] });
  const got = await fetchLinkedIn(li);
  const photo = got.photo ? await storePhotoFromUrl(t.id, got.photo, 'guy') : false;
  const now = new Date().toISOString();
  await saveSpeaker({
    userId: t.id, name: got.name || handle.replace(/-(?=[a-z0-9]*\d)[a-z0-9]{2,}$/, '').split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    headline: got.headline ?? null, company: got.company ?? null, bio: got.about ?? '', linkedin: li, website: null,
    topics: [], events: [], openTo: [], image: null, photoConsent: false, photoStyle: 'guy', managed: true,
    status: 'pending', createdAt: now, updatedAt: now,
  }, false);
  const fields = (['name', 'headline', 'company', 'about'] as const).filter(k => got[k]).concat(photo ? ['photo' as never] : []);
  redirect(`/portal/speaker?as=${t.id}&new=1&` + (got.ok ? `li=ok&got=${fields.join(',')}` : `li=none&why=${encodeURIComponent(got.reason ?? '')}`));
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
  const { renderNotice } = await import('@/lib/templates');
  const m = await renderNotice('message', { subject }, link);
  await sendEmail({ to: r.email, subject: m.subject, text: m.text, html: m.html, tag: 'message' });
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
async function admin(p: 'content.moderate' | 'users.manage' | 'reports.manage' | 'leads.manage') {
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
export async function saveLead(f: FormData) {
  await admin('leads.manage');
  const id = str(f, 'id', 60);
  const status = str(f, 'status', 20) as LeadStatus;
  await updateLead(id, { ...(LEAD_STATUSES.some(s => s.key === status) ? { status } : {}), notes: str(f, 'notes', 4000) });
  redirect(`/admin?tab=leads&lead=${id}&${str(f, 'filters', 200)}&done=saved#${id}`);
}
export async function closeReport(f: FormData) {
  await admin('reports.manage');
  await resolveReport(str(f, 'id', 60));
  redirect('/admin?tab=reports&done=resolved');
}

/** Admin: hide or show a speaker that comes from the Google Sheet (the sheet itself is untouched). */
export async function toggleSheetSpeaker(f: FormData) {
  await admin('content.moderate');
  const id = str(f, 'id', 120);
  const { hideSheetSpeaker } = await import('@/lib/portal');
  await hideSheetSpeaker(id, str(f, 'action', 10) === 'hide');
  redirect(`/admin?tab=speakers&done=${str(f, 'action', 10) === 'hide' ? 'hide' : 'approve'}#sheet-speakers`);
}

// ---------- Emails & forms (Admin) ----------
export async function saveEmailTemplate(f: FormData) {
  await admin('content.moderate');
  const { isTemplateKey, saveTemplate, resetTemplate } = await import('@/lib/templates');
  const key = str(f, 'key', 40);
  if (!isTemplateKey(key)) redirect('/admin?tab=emails');
  if (f.get('reset') === '1') { await resetTemplate(key); redirect(`/admin?tab=emails&saved=${key}&reset=1#tpl-${key}`); }
  await saveTemplate(key, { subject: str(f, 'subject', 200), heading: str(f, 'heading', 200), body: str(f, 'body', 4000), button: str(f, 'button', 80), footer: str(f, 'footer', 300) });
  redirect(`/admin?tab=emails&saved=${key}#tpl-${key}`);
}
export async function sendTestEmail(f: FormData) {
  const a = await admin('content.moderate');
  const { isTemplateKey, renderNotice, renderEvents, TEMPLATES, SAMPLE_VARS: SAMPLE } = await import('@/lib/templates');
  const key = str(f, 'key', 40);
  if (!isTemplateKey(key)) redirect('/admin?tab=emails');
  if (a.email.endsWith('.invalid')) redirect(`/admin?tab=emails&test=demo&key=${key}#tpl-${key}`);
  if (await tooMany(`testmail:${a.id}`, 20, 3600)) redirect(`/admin?tab=emails&test=busy#tpl-${key}`);
  const base = siteUrl();
  const m = TEMPLATES[key].kind === 'events'
    ? await renderEvents(key as 'reminder' | 'digest', SAMPLE, { items: [{ name: 'Retail Expo (sample)', when: 'Tomorrow · 18 Nov 2026', where: 'ExCeL, London', url: `${base}/guide` }], manageUrl: `${base}/account`, unsubscribeUrl: `${base}/account` })
    : await renderNotice(key, SAMPLE, `${base}/guide`);
  const ok = await sendEmail({ to: a.email, subject: `[Test] ${m.subject}`, text: m.text, html: m.html, tag: `test:${key}` });
  redirect(`/admin?tab=emails&test=${ok ? 'sent' : 'failed'}&key=${key}#tpl-${key}`);
}
export async function saveFormText(f: FormData) {
  await admin('content.moderate');
  const { FORMS, isFormKey, saveFormCopy, resetFormCopy } = await import('@/lib/forms');
  const key = str(f, 'key', 40);
  if (!isFormKey(key)) redirect('/admin?tab=emails');
  if (f.get('reset') === '1') { await resetFormCopy(key); redirect(`/admin?tab=emails&form=${key}&reset=1#form-${key}`); }
  const v: Record<string, string> = {};
  for (const k of Object.keys(FORMS[key].fields)) v[k] = str(f, k, 2000);
  await saveFormCopy(key, v);
  redirect(`/admin?tab=emails&form=${key}#form-${key}`);
}
