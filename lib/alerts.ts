// Emails to the team about things happening on the site: enquiries (app/api/enquire) and
// membership changes (app/api/stripe/webhook). They go to ENQUIRIES_TO, or ALERTS_TO if you want
// membership alerts somewhere else. Set either to a comma-separated list for several people.
import { sendEmail } from './email';

export const enquiriesTo = () => process.env.ENQUIRIES_TO || 'hello@theeventsguy.co.uk';
export const alertsTo = () => process.env.ALERTS_TO || enquiriesTo();
/** The public address people see and reply to. Never the private alert inbox above. */
export const publicEmail = () => process.env.PUBLIC_EMAIL || 'hello@theeventsguy.co.uk';
const list = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

/** Send a short plain-text alert to each address in the list. Never throws. */
export async function teamAlert(to: string, subject: string, lines: (string | false | null | undefined)[]) {
  const text = lines.filter(Boolean).join('\n');
  for (const addr of list(to)) await sendEmail({ to: addr, subject, text }).catch(() => false);
}
