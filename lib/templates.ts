// Every email the site sends to customers, editable in Admin → Emails & forms.
// Each template has a default here; an admin's edits are stored in Redis (`tpl:<key>`) and
// override the default field by field. "Reset" deletes the override. Text uses {placeholders},
// which are filled in when the email is sent (unknown ones are left as typed so mistakes show).
import { getJSON, setJSON, del, storeReady } from './store';
import { noticeEmail, eventsEmail } from './email';

export type TemplateKey =
  | 'login' | 'welcome' | 'paymentFailed' | 'renewing' | 'cancelling' | 'ended' | 'refunded'
  | 'ack_services' | 'ack_sponsors' | 'ack_awards' | 'message' | 'reminder' | 'digest';

export type Template = {
  subject: string;
  heading: string;
  body: string;        // paragraphs, separated by a blank line
  button?: string;     // button label (the link is set by the site)
  footer?: string;     // events emails only: the line above the settings links
};
type Def = Template & { label: string; when: string; group: 'Account' | 'Membership' | 'Forms' | 'Updates'; vars: Record<string, string>; kind?: 'notice' | 'events' };

export const TEMPLATES: Record<TemplateKey, Def> = {
  login: {
    group: 'Account', label: 'Sign-in link', when: 'Someone asks for a sign-in link (also used as “forgotten password”: there are no passwords).',
    subject: 'Your sign-in link for The Events Guy', heading: 'Sign in to The Events Guy',
    body: 'Here’s your link to sign in. It works once, for 30 minutes.\n\nIf you didn’t ask for this, you can ignore this email.',
    button: 'Sign in', vars: {},
  },
  welcome: {
    group: 'Membership', label: 'Membership confirmation', when: 'Someone pays for a membership (sent once per checkout).',
    subject: 'Welcome to The Events Guy', heading: 'Welcome to The Events Guy',
    body: 'Thanks for joining on the {plan} plan. Your membership runs to {until} and renews automatically.\n\n{access}\n\nUse the button to sign in on any device. It works once, for 30 minutes. After that, request a fresh link with this email address.',
    button: 'Sign in and get started',
    vars: { plan: 'quarterly or yearly', until: 'the date the paid period ends', access: 'what their plan opens up (worded by the site for quarterly or yearly)' },
  },
  paymentFailed: {
    group: 'Membership', label: 'Payment failed', when: 'A renewal payment fails (Stripe retries).',
    subject: 'Your payment didn’t go through', heading: 'Your payment didn’t go through',
    body: 'We couldn’t take your membership payment of {amount}. Stripe will try again over the next few days.\n\nTo keep your access, please check your card details. It only takes a minute.',
    button: 'Update your card', vars: { amount: 'the amount due, e.g. £45.00' },
  },
  renewing: {
    group: 'Membership', label: 'Renewal reminder', when: 'Before each renewal (Stripe decides how many days before).',
    subject: 'Your membership renews soon', heading: 'Your membership renews soon',
    body: 'Your membership renews on {date} for {amount}. You don’t need to do anything.\n\nIf you’d like to change plan or cancel, you can do it from your account before then.',
    button: 'Manage membership', vars: { date: 'the renewal date', amount: 'the amount' },
  },
  cancelling: {
    group: 'Membership', label: 'Cancellation confirmed', when: 'A member cancels (access continues to the end of the period).',
    subject: 'Your membership is set to end', heading: 'Your membership is set to end',
    body: 'You’ve cancelled your membership. You keep full access until {until}, and you won’t be charged again.\n\nChanged your mind? You can restart it from your account any time before then.',
    button: 'Restart membership', vars: { until: 'the last day of access' },
  },
  ended: {
    group: 'Membership', label: 'Membership ended', when: 'A membership ends.',
    subject: 'Your membership has ended', heading: 'Your membership has ended',
    body: 'Your membership has now ended. Your account, shortlist and saved searches are still there, and you can still see what’s on over the next 30 days.\n\nRejoin any time to get full event details again.',
    button: 'See membership plans', vars: {},
  },
  refunded: {
    group: 'Membership', label: 'Refund', when: 'A payment is refunded.',
    subject: 'Your refund is on its way', heading: 'Your refund is on its way',
    body: 'We’ve refunded {amount}. It usually reaches your account in 5–10 working days.\n\nYour membership has ended. Your free account stays open if you want to keep browsing.',
    button: 'Go to your account', vars: { amount: 'the amount refunded' },
  },
  ack_services: {
    group: 'Forms', label: 'Services enquiry: auto-reply', when: 'Someone sends the Services enquiry form.',
    subject: 'Thanks — we’ve got your enquiry', heading: 'Thanks — we’ve got your enquiry',
    body: 'Hi {first_name},\n\nThanks for getting in touch with The Events Guy. We’ve got your message and will come back to you within two working days.\n\nIf anything changes in the meantime, just reply to this email.',
    button: 'Browse the guide', vars: { first_name: 'their first name' },
  },

  ack_sponsors: {
    group: 'Forms', label: 'Sponsors enquiry: auto-reply', when: 'Someone sends the Sponsors enquiry form.',
    subject: 'Thanks for your interest in sponsoring', heading: 'Thanks for your interest in sponsoring',
    body: 'Hi {first_name},\n\nThanks for your interest in sponsoring The Events Guy. We’ll send availability and rates within two working days.\n\nIf you have dates or a budget in mind, reply to this email and we’ll take them into account.',
    button: 'Browse the guide', vars: { first_name: 'their first name' },
  },

  ack_awards: {
    group: 'Forms', label: 'Awards finder: auto-reply', when: 'Someone asks for help from the awards finder.',
    subject: 'Your awards shortlist — we’ll be in touch', heading: 'Your awards shortlist — we’ll be in touch',
    body: 'Hi {first_name},\n\nThanks for sending your awards finder answers. We’ll come back within two working days with the awards we’d prioritise for you and how to make the entries count.\n\nYou can revisit your shortlist any time from the link below.',
    button: 'See my shortlist', vars: { first_name: 'their first name' },
  },

  message: {
    group: 'Updates', label: 'New portal message', when: 'Someone gets a new enquiry or reply in their portal inbox.',
    subject: 'New message on The Events Guy: {subject}', heading: 'You have a new message',
    body: '{subject}\n\nWe don’t share your email address: replies go through The Events Guy.',
    button: 'Read and reply', vars: { subject: 'the conversation’s subject' },
  },
  reminder: {
    group: 'Updates', label: 'Event reminders', when: 'A week and a day before a member’s saved events.', kind: 'events',
    subject: 'Reminder: {first_event}', heading: '{headline}',
    body: 'A reminder about events on your shortlist. Check the organiser’s site for final timings and tickets.',
    footer: 'You’re getting this because you saved these events on The Events Guy.',
    vars: { first_event: 'the event’s name, or “3 saved events coming up” when there are several', headline: 'e.g. “Retail Expo is tomorrow” or “3 of your events are coming up”' },
  },

  digest: {
    group: 'Updates', label: 'New events', when: 'After a weekly update adds events (members who asked for it).', kind: 'events',
    subject: 'New in The Events Guy: {count} event{s}', heading: '{count} new event{s} in the guide',
    body: 'This week’s update added {count} event{s}. Save the ones you want and they’ll go straight into your calendar feed.',
    footer: 'See them all in the guide.', vars: { count: 'how many events were added', s: '“s” when more than one' },
  },
};

const K = (k: TemplateKey) => `tpl:${k}`;
export const isTemplateKey = (k: string): k is TemplateKey => k in TEMPLATES;

/** The template as it's sent now: the default with any admin edits on top. */
export async function getTemplate(key: TemplateKey): Promise<Template & { edited: boolean }> {
  const d = TEMPLATES[key];
  const o = storeReady() ? await getJSON<Partial<Template>>(K(key)).catch(() => null) : null;
  const pick = (f: keyof Template) => (o && typeof o[f] === 'string' && o[f]!.trim() ? o[f] : d[f]);
  return { subject: pick('subject')!, heading: pick('heading')!, body: pick('body')!, button: pick('button'), footer: pick('footer'), edited: Boolean(o) };
}
export async function saveTemplate(key: TemplateKey, t: Partial<Template>) { await setJSON(K(key), t); }
export async function resetTemplate(key: TemplateKey) { await del(K(key)); }

export const fill = (s: string, vars: Record<string, string>) => s.replace(/\{([a-z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const paras = (body: string, vars: Record<string, string>) => fill(body, vars).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

/** A branded email from a template: subject, text and HTML ready for sendEmail. */
export async function renderNotice(key: TemplateKey, vars: Record<string, string>, buttonUrl?: string) {
  const t = await getTemplate(key);
  const mail = noticeEmail({ heading: fill(t.heading, vars), paras: paras(t.body, vars), ...(t.button && buttonUrl ? { button: { label: fill(t.button, vars), url: buttonUrl } } : {}) });
  return { subject: fill(t.subject, vars), ...mail };
}
/** An events-list email (reminders, new events) from a template. */
export async function renderEvents(key: 'reminder' | 'digest', vars: Record<string, string>, o: { items: Parameters<typeof eventsEmail>[0]['items']; manageUrl: string; unsubscribeUrl: string; footer?: string }) {
  const t = await getTemplate(key);
  const mail = eventsEmail({ heading: fill(t.heading, vars), intro: paras(t.body, vars).join(' '), items: o.items, footer: o.footer ?? fill(t.footer ?? '', vars), manageUrl: o.manageUrl, unsubscribeUrl: o.unsubscribeUrl });
  return { subject: fill(t.subject, vars), ...mail };
}

/** Made-up values for previews and test sends. */
export const SAMPLE_VARS: Record<string, string> = {
  plan: 'quarterly', until: '17 February 2027', date: '17 February 2027', amount: '£45.00', first_name: 'Alex',
  access: 'Every event and award in the calendar quarter you joined is open in full now: venue, prices, booking links and speakers.',
  subject: 'Headline sponsorship', first_event: 'Retail Expo', headline: 'Retail Expo is tomorrow', count: '3', s: 's',
};
