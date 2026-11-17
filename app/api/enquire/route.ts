import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/stripe';
import { clientIp, storeReady, tooMany } from '@/lib/store';
import { createLead, FORM_LABELS, updateLead, type LeadForm } from '@/lib/leads';
import { setMarketing } from '@/lib/marketing';
import { sendEmail } from '@/lib/email';
import { renderNotice } from '@/lib/templates';
import { enquiriesTo, publicEmail } from '@/lib/alerts';

// Services, Sponsors and Awards-finder enquiries.
// 1. Save it as a lead (so nothing is lost), 2. email you, 3. send the person an acknowledgement,
// 4. record marketing consent if they ticked the box.
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
    alerted = (await sendEmail({ to: addr, replyTo: email, subject: `New ${FORM_LABELS[form]} enquiry${get('interest') ? `: ${get('interest')}` : ''} — ${get('name')}`, text: lines, tag: `alert-${form}`, hideTo: true })) || alerted;
  if (lead && alerted) await updateLead(lead.id, { emailed: true });

  // Acknowledgement to them (wording: Admin → Emails & forms)
  const ack = await renderNotice(`ack_${form}`, { first_name: get('name').split(' ')[0] }, form === 'awards' ? `${base}${awardsBack}` : `${base}/guide`);
  // Replies go to the public address, so the private alert inbox (ENQUIRIES_TO) is never shown to the sender.
  await sendEmail({ to: email, replyTo: publicEmail(), subject: ack.subject, text: ack.text, html: ack.html, tag: `ack_${form}` });
  return back;
}
