// Who "Send a test" goes to, set in Admin → Emails & forms: the signed-in admin, any extra
// addresses typed in, and optionally the team alert inbox (ENQUIRIES_TO), which is sent to but
// never shown on the site.
import { getJSON, setJSON, storeReady } from './store';
import { enquiriesTo } from './alerts';

type Settings = { extra: string[]; me: boolean; team: boolean };
const KEY = 'test-recipients';
const valid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !e.endsWith('.invalid');

export async function testSettings(): Promise<Settings> {
  const s = storeReady() ? await getJSON<Settings>(KEY).catch(() => null) : null;
  return { extra: s?.extra ?? [], me: s?.me ?? true, team: s?.team ?? false };
}
/** Saves the list; returns any addresses that weren't valid (they're left out). */
export async function saveTestSettings(raw: string, me: boolean, team: boolean): Promise<string[]> {
  const all = [...new Set(raw.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean))];
  const good = all.filter(valid).slice(0, 10), bad = all.filter(x => !valid(x));
  await setJSON(KEY, { extra: good, me, team });
  return bad;
}
/** Everyone a test goes to, without duplicates. */
export async function testRecipients(adminEmail: string): Promise<{ list: { addr: string; hidden: boolean }[] }> {
  const s = await testSettings();
  const out = new Map<string, boolean>();
  if (s.me && valid(adminEmail)) out.set(adminEmail.toLowerCase(), false);
  for (const e of s.extra) if (!out.has(e)) out.set(e, false);
  if (s.team && process.env.ENQUIRIES_TO) for (const e of enquiriesTo().split(',').map(x => x.trim().toLowerCase()).filter(valid)) out.set(e, true);
  return { list: [...out].map(([addr, hidden]) => ({ addr, hidden })) };
}
