// Marketing consent (UK GDPR / PECR): the monthly roundup goes only to people who ticked an
// unticked box. We keep when and where they agreed, and every roundup has a one-click unsubscribe.
// Service emails (sign-in links, receipts, membership and reminders someone asked for) aren't marketing.
import { addTo, getJSON, setJSON } from './store';
import { sign } from './access';
import { normEmail } from './users';

export type Subscriber = { email: string; subscribed: boolean; source: string; consentAt: string | null; unsubscribedAt: string | null; updatedAt: string };
const key = (email: string) => `sub:${normEmail(email)}`;

export const getSubscriber = (email: string) => getJSON<Subscriber>(key(email));
export async function setMarketing(email: string, on: boolean, source: string) {
  const prev = await getSubscriber(email); const now = new Date().toISOString();
  if (!prev && !on) return null; // never create a record just to say no
  const s: Subscriber = { email: normEmail(email), subscribed: on, source: on ? source : prev?.source ?? source,
    consentAt: on ? (prev?.subscribed ? prev.consentAt : now) : prev?.consentAt ?? null, unsubscribedAt: on ? null : now, updatedAt: now };
  await setJSON(key(email), s); await addTo('subscribers', s.email);
  return s;
}
/** A 10-year link that unsubscribes this address from the roundup, no sign-in needed. */
export const newsToken = (email: string) => sign({ c: normEmail(email), e: Math.floor(Date.now() / 1000) + 10 * 365 * 86400, t: 'news' });
