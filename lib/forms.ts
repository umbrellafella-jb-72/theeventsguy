// Wording on the site's forms, editable in Admin → Emails & forms. Defaults live here; an admin's
// edits are stored in Redis (`formcopy:<key>`) and override them field by field.
import { del, getJSON, setJSON, storeReady } from './store';
import { INTERESTS } from './offers';

export type FormKey = 'services' | 'sponsors' | 'awards' | 'speakerApply' | 'sponsorProfile' | 'optin';
type Field = { label: string; long?: boolean; hint?: string };
type Def = { label: string; where: string; fields: Record<string, Field>; defaults: Record<string, string> };

const enquiry = (heading: string, intro: string, button: string, thanksHeading: string, thanksText: string): Record<string, string> =>
  ({ heading, intro, interests: INTERESTS.join('\n'), button, thanksHeading, thanksText });
const ENQUIRY_FIELDS: Record<string, Field> = {
  heading: { label: 'Heading' }, intro: { label: 'Intro (optional)', long: true },
  interests: { label: '“Interested in” options', long: true, hint: 'One per line. The first is picked unless the page chooses one.' },
  button: { label: 'Button' }, thanksHeading: { label: 'Thank-you heading' }, thanksText: { label: 'Thank-you message', long: true },
};

export const FORMS: Record<FormKey, Def> = {
  services: { label: 'Services enquiry form', where: '/services', fields: ENQUIRY_FIELDS,
    defaults: enquiry('Get in touch', '', 'Send enquiry', 'Thanks — we have your message', 'We will reply by email, usually within a couple of working days.') },
  sponsors: { label: 'Sponsors enquiry form', where: '/sponsors', fields: ENQUIRY_FIELDS,
    defaults: enquiry('Get in touch', '', 'Send enquiry', 'Thanks — we have your message', 'We will reply by email, usually within a couple of working days.') },
  awards: { label: 'Awards finder: ask for help', where: '/awards/finder', fields: {
      heading: { label: 'Heading' }, intro: { label: 'Intro', long: true }, messageLabel: { label: 'Message box label' },
      button: { label: 'Button' }, thanksHeading: { label: 'Thank-you heading' }, thanksText: { label: 'Thank-you message', long: true } },
    defaults: { heading: 'Want a hand with the entries?', intro: 'Send us your answers and we’ll tell you which of these to prioritise, what the judges look for and how to write an entry that gets shortlisted.',
      messageLabel: 'Anything we should know?', button: 'Send my answers', thanksHeading: 'Thanks — we have your answers',
      thanksText: 'We’ll come back by email, usually within a couple of working days, with the awards we’d go for and how to make the entries count.' } },
  speakerApply: { label: 'Speakers: apply to be listed', where: '/speakers', fields: {
      heading: { label: 'Heading' }, intro: { label: 'Intro', long: true }, button: { label: 'Button' },
      thanksHeading: { label: 'Thank-you heading' }, thanksText: { label: 'Thank-you message', long: true } },
    defaults: { heading: 'Speaking at an event in the guide? Apply to be listed',
      intro: 'Tell us who you are and what you talk about. We check every profile before it goes live, and organisers can contact you without ever seeing your email address.',
      button: 'Apply to be listed', thanksHeading: 'Thanks — your application is in',
      thanksText: 'We’ll check it and email you when you’re listed, usually within a few working days. Sign in with the same email address to add a photo or make changes.' } },
  sponsorProfile: { label: 'Sponsors: request a sponsor profile', where: '/sponsors', fields: {
      heading: { label: 'Heading' }, intro: { label: 'Intro', long: true }, button: { label: 'Button' },
      thanksHeading: { label: 'Thank-you heading' }, thanksText: { label: 'Thank-you message', long: true } },
    defaults: { heading: 'Get your brand listed as a sponsor',
      intro: 'A free sponsor profile puts your brand in front of organisers looking for partners, and shows you every sponsorship opportunity with budgets and contacts. We check every profile before it goes live.',
      button: 'Request my sponsor profile', thanksHeading: 'Thanks — your sponsor profile request is in',
      thanksText: 'We’ll check it and email you when it’s live, usually within a few working days. Sign in with the same email address to edit it or browse opportunities.' } },
  optin: { label: 'Roundup opt-in (on every form and sign-in)', where: 'all forms', fields: {
      label: { label: 'Tick-box wording on forms', long: true }, signin: { label: 'Tick-box wording on the sign-in page', long: true },
      privacy: { label: 'Privacy line under forms', long: true, hint: '“privacy policy” becomes a link.' } },
    defaults: { label: 'Send me The Events Guy’s monthly roundup of new events and awards. Unsubscribe any time.',
      signin: 'Also send me the monthly roundup of new events and awards. Unsubscribe any time.',
      privacy: 'We’ll use your details to reply to this message. See our privacy policy.' } },
};

const K = (k: FormKey) => `formcopy:${k}`;
export const isFormKey = (k: string): k is FormKey => k in FORMS;
export async function formCopy(key: FormKey): Promise<Record<string, string> & { edited?: string }> {
  const d = FORMS[key].defaults;
  const o = storeReady() ? await getJSON<Record<string, string>>(K(key)).catch(() => null) : null;
  const out: Record<string, string> = { ...d };
  if (o) for (const f of Object.keys(d)) if (typeof o[f] === 'string' && o[f].trim()) out[f] = o[f];
  return o ? { ...out, edited: '1' } : out;
}
export async function saveFormCopy(key: FormKey, v: Record<string, string>) { await setJSON(K(key), v); }
export async function resetFormCopy(key: FormKey) { await del(K(key)); }
export const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean);
