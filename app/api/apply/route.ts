import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/stripe';
import { clientIp, storeReady, tooMany } from '@/lib/store';
import { createLead, FORM_LABELS, updateLead, type LeadForm } from '@/lib/leads';
import { setMarketing } from '@/lib/marketing';
import { sendEmail } from '@/lib/email';
import { renderNotice } from '@/lib/templates';
import { enquiriesTo, publicEmail } from '@/lib/alerts';
import { verifyRecaptcha } from '@/lib/recaptcha';
import { normaliseLinkedIn } from '@/lib/linkedin';
import { cleanUrl, getSpeaker, getSponsor, list, OPEN_TO, saveSpeaker, saveSponsor, SECTOR_OPTIONS } from '@/lib/portal';
import { ensureUser, saveUser } from '@/lib/users';

// Public "Apply to be listed" (speakers) and "Request a sponsor profile" (sponsors) forms.
// 1. Bot checks: hidden honeypot field, rate limit, reCAPTCHA v3 (when set up).
// 2. Save it as a lead, and create the person's account with a profile waiting for approval
//    (they claim it by signing in with the same email; nothing is public until an admin approves).
// 3. Alert the team, send the applicant an acknowledgement, record roundup consent if ticked.
export async function POST(req: Request) {
  const base = siteUrl(req);
  const f = await req.formData();
  const get = (k: string, max = 4000) => String(f.get(k) || '').trim().slice(0, max);
  const form: LeadForm = get('kind') === 'sponsor' ? 'sponsorProfile' : 'speakerApply';
  const isSponsor = form === 'sponsorProfile';
  const page = isSponsor ? '/sponsors' : '/speakers';
  const anchor = isSponsor ? '#sponsor-profile' : '#apply';
  const done = NextResponse.redirect(`${base}${page}?applied=1${anchor}`, 303);
  const fail = (why: string) => NextResponse.redirect(`${base}${page}?apply_error=${why}${anchor}`, 303);

  if (get('company_url')) return done; // a bot filled the hidden field: looks like success, nothing saved
  if (await tooMany(`apply:${clientIp(req)}`, 5, 3600)) return fail('busy');
  const captcha = await verifyRecaptcha(get('captcha'), isSponsor ? 'sponsor_profile' : 'speaker_apply', clientIp(req));
  if (!captcha.ok) { console.warn('[apply] reCAPTCHA refused', captcha); return fail('captcha'); }

  const email = get('email', 200).toLowerCase();
  const name = get('name', 120);
  const company = get('company', 160);
  const linkedin = normaliseLinkedIn(get('linkedin', 300));
  const text = isSponsor ? get('about', 1200) : get('bio', 1200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('missing');
  if (!isSponsor && (!linkedin || !get('topics'))) return fail(linkedin || !get('linkedin') ? 'missing' : 'linkedin');
  if (isSponsor && (!company || !text)) return fail('missing');
  const marketing = get('marketing') === 'yes';
  const openTo = f.getAll('openTo').map(String).filter(x => OPEN_TO.includes(x)).slice(0, 6);
  const sectors = f.getAll('sectors').map(String).filter(x => SECTOR_OPTIONS.includes(x)).slice(0, 12);

  // The applicant's account, with a profile waiting for approval.
  const details: Record<string, string> = isSponsor
    ? { website: get('website', 300), sectors: sectors.join(', '), wants_to_sponsor: get('interests', 400), budget: get('budget', 120) }
    : { linkedin: linkedin ?? '', headline: get('headline', 120), topics: get('topics', 400), speaking_at: get('events', 600), open_to: openTo.join(', ') };
  let profileId: string | null = null;
  if (storeReady()) {
    try {
      const u = await ensureUser(email, { name });
      const role = isSponsor ? 'sponsor' : 'speaker';
      if (!u.roles.includes(role)) await saveUser({ ...u, roles: [...u.roles, role] });
      const now = new Date().toISOString();
      if (!isSponsor) {
        if (await getSpeaker(u.id)) details.note = 'They already had a speaker profile, so it wasn’t changed.';
        else await saveSpeaker({
          userId: u.id, name, headline: get('headline', 120) || null, company: company || null, bio: text,
          linkedin, website: cleanUrl(get('website', 300)), topics: list(get('topics', 400)).slice(0, 12), events: [], openTo,
          image: null, photoConsent: false, photoStyle: 'guy', status: 'pending', createdAt: now, updatedAt: now,
        }, false);
      } else {
        if (await getSponsor(u.id)) details.note = 'They already had a sponsor profile, so it wasn’t changed.';
        else await saveSponsor({
          userId: u.id, company, website: cleanUrl(get('website', 300)), about: text, sectors,
          interests: list(get('interests', 400)).slice(0, 12), budget: get('budget', 120) || null, contactName: name,
          status: 'pending', createdAt: now, updatedAt: now,
        }, false);
      }
      profileId = u.id;
    } catch (e) { console.error('[apply] profile failed', e); }
  }
  if (captcha.score !== undefined) details.recaptcha_score = String(captcha.score);
  for (const k of Object.keys(details)) if (!details[k]) delete details[k];

  const lead = storeReady()
    ? await createLead({ form, name, email, company: company || null, interest: FORM_LABELS[form], message: text || null, details, page, marketing }).catch(() => null)
    : null;
  if (marketing && storeReady()) await setMarketing(email, true, `${FORM_LABELS[form]} form`).catch(() => null);

  // Alert to the team
  const lines = [`Name: ${name}`, `Email: ${email}`, company && `Company: ${company}`,
    ...Object.entries(details).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`),
    text && `\n${isSponsor ? 'About' : 'Bio'}:\n${text}`,
    `\nMonthly roundup: ${marketing ? 'yes, opted in' : 'no'}`,
    profileId && `\nReview and approve: ${base}/admin?tab=queue`,
    profileId && !isSponsor && `Edit the profile (Fill from LinkedIn, photo): ${base}/portal/speaker?as=${profileId}`,
    lead && `Lead: ${base}/admin?tab=leads&lead=${lead.id}`].filter(Boolean).join('\n');
  let alerted = false;
  for (const addr of enquiriesTo().split(',').map(x => x.trim()).filter(Boolean))
    alerted = (await sendEmail({ to: addr, replyTo: email, subject: `New ${FORM_LABELS[form].toLowerCase()}: ${isSponsor ? company : name}`, text: lines, tag: `alert-${form}`, hideTo: true })) || alerted;
  if (lead && alerted) await updateLead(lead.id, { emailed: true });

  // Acknowledgement (wording: Admin → Emails & forms)
  const ack = await renderNotice(`ack_${form}`, { first_name: name.split(' ')[0], company }, `${base}/login?next=${isSponsor ? '/portal/sponsor' : '/portal/speaker'}`);
  await sendEmail({ to: email, replyTo: publicEmail(), subject: ack.subject, text: ack.text, html: ack.html, tag: `ack_${form}` });
  return done;
}
