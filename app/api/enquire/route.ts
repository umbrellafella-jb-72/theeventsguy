import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/stripe';
import { clientIp, storeReady, tooMany } from '@/lib/store';
import { createLead, FORM_LABELS, updateLead, type LeadForm } from '@/lib/leads';
import { setMarketing } from '@/lib/marketing';
import { noticeEmail, sendEmail } from '@/lib/email';
import { enquiriesTo, publicEmail } from '@/lib/alerts';

// Services, Sponsors and Awards-finder enquiries.
// 1. Save it as a lead (so nothing is lost), 2. email you, 3. send the person an acknowledgement,
// 4. record marketing consent if they ticked the box.
const REPLIES: Record<LeadForm, { subject: string; paras: (name: string) => string[] }> = {
  services: { subject: 'Thanks — we’ve got your enquiry', paras: n => [`Hi ${n},`, 'Thanks for getting in touch with The Events Guy. We’ve got your message and will come back to you within two working days.', 'If anything changes in the meantime, just reply to this email.'] },
  sponsors: { subject: 'Thanks for your interest in sponsoring', paras: n => [`Hi ${n},`, 'Thanks for your interest in sponsoring The Events Guy. We’ll send availability and rates within two working days.', 'If you have dates or a budget in mind, reply to this email and we’ll take them into account.'] },
  awards: { subject: 'Your awards shortlist — we’ll be in touch', paras: n => [`Hi ${n},`, 'Thanks for sending your awards finder answers. We’ll come back within two working days with the awards we’d prioritise for you and how to make the entries count.', 'You can revisit your shortlist any time from the link below.'] },
};

export async function POST(req: Request) {
  const base = siteUrl(req);
  const f = await req.formData();
  const get = (k: string) => String(f.get(k) || '').trim().slice(0, 4000);
  const form: LeadForm = get('from') === 'sponsors' ? 'sponsors' : get('from') === 'awards' ? 'awards' : 'services';
  const awardsBack = (() => { const b = get('back'); return b.startsWith('/awards/finder') && !b.startsWith('//') ? b : '/awards/finder'; })();
  const back = form === 'awards'
    ? NextResponse.redirect(`${base}${awardsBack}${awardsBack.includes('?') ? '&' : '?'}sent=1#enquire`, 303)
    : NextResponse.redirect(`${base}/${form}?sent=1#enquire`, 303);
  // Bots fill the hidden field; they get the normal thank-you but nothing is saved or sent.
  // People are limited to 5 enquiries an hour per IP address.
  if (get('company_url') || await tooMany(`enquire:${clientIp(req)}`, 5, 3600)) return back;
  const email = get('email').toLowerCase();
  const ok = get('name') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (form === 'awards' ? get('quiz') : get('message'));
  if (!ok) return NextResponse.redirect(`${base}${form === 'awards' ? awardsBack : `/${form}`}#enquire`, 303);

  const marketing = get('marketing') === 'yes';
  const details: Record<string, string> = {};
  if (form === 'awards') { details.quiz = get('quiz'); if (get('shortlist')) details.shortlist = get('shortlist'); }
  const page = (() => { try { const r = new URL(req.headers.get('referer') || ''); return r.origin === new URL(base).origin ? r.pathname + r.search : null; } catch { return null; } })() ?? (form === 'awards' ? awardsBack : `/${form}`);
  const lead = storeReady()
    ? await createLead({ form, name: get('name').slice(0, 120), email, company: get('company').slice(0, 160) || null, interest: get('interest').slice(0, 120) || null, message: get('message') || null, details, page, marketing }).catch(err => { console.error('[leads] save failed', err); return null; })
    : null;
  if (marketing && storeReady()) await setMarketing(email, true, `${FORM_LABELS[form]} form`).catch(() => null);

  // Alert to you
  const lines = [`Name: ${get('name')}`, `Email: ${email}`, get('company') && `Company: ${get('company')}`, get('interest') && `Interested in: ${get('interest')}`,
    details.quiz && `\nQuiz answers:\n${details.quiz}`, details.shortlist && `\nTheir shortlist: ${details.shortlist}`, get('message') && `\nMessage:\n${get('message')}`,
    `\nMonthly roundup: ${marketing ? 'yes, opted in' : 'no'}`, `Sent from: ${base}${page}`, lead ? `\nWork this lead: ${base}/admin?tab=leads&lead=${lead.id}` : ''].filter(Boolean).join('\n');
  const to = enquiriesTo();
  let alerted = false;
  for (const addr of to.split(',').map(x => x.trim()).filter(Boolean))
    alerted = (await sendEmail({ to: addr, replyTo: email, subject: `New ${FORM_LABELS[form]} enquiry${get('interest') ? `: ${get('interest')}` : ''} — ${get('name')}`, text: lines })) || alerted;
  if (lead && alerted) await updateLead(lead.id, { emailed: true });

  // Acknowledgement to them
  const r = REPLIES[form];
  const mail = noticeEmail({ heading: r.subject, paras: r.paras(get('name').split(' ')[0]),
    button: form === 'awards' ? { label: 'See my shortlist', url: `${base}${awardsBack}` } : { label: 'Browse the guide', url: `${base}/guide` } });
  // Replies go to the public address, so the private alert inbox (ENQUIRIES_TO) is never shown to the sender.
  await sendEmail({ to: email, replyTo: publicEmail(), subject: r.subject, ...mail });
  return back;
}
