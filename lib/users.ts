import { cookies } from 'next/headers';
import { sign, verify } from './access';
import { addTo, allIn, getJSON, newId, redis, setJSON, storeReady } from './store';
import type { Role } from './permissions';

export type SavedSearch = { id: string; name: string; query: string; createdAt: string };
export type User = {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];                 // always includes 'registered'
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  // Membership (Stripe). A free account has no customer.
  customer: string | null;
  paidUntil: number;             // unix seconds; 0 = never paid
  // Free-account features
  saved: string[];               // shortlisted event ids
  searches: SavedSearch[];
  prefs: { newEvents: boolean; reminders: boolean };
};

export const SESSION = 'eg_session';
const KEY = (id: string) => `user:${id}`;
const EMAIL = (e: string) => `user-email:${e.toLowerCase()}`;
export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** ADMIN_EMAILS (comma-separated) are made admins when they sign in. */
const adminEmails = () => (process.env.ADMIN_EMAILS || '').split(',').map(normEmail).filter(Boolean);

export async function getUser(id: string): Promise<User | null> {
  const u = await getJSON<User>(KEY(id));
  return u ? { ...u, roles: [...new Set<Role>(['registered', ...u.roles])], saved: u.saved ?? [], searches: u.searches ?? [], prefs: u.prefs ?? { newEvents: true, reminders: true } } : null;
}
export async function userByEmail(email: string): Promise<User | null> {
  const id = await redis<string | null>('GET', EMAIL(normEmail(email)));
  return id ? getUser(id) : null;
}
export async function saveUser(u: User): Promise<User> {
  const next = { ...u, updatedAt: new Date().toISOString() };
  await setJSON(KEY(u.id), next);
  await redis('SET', EMAIL(u.email), u.id);
  await addTo('users', u.id);
  return next;
}
export async function allUsers(): Promise<User[]> { return allIn<User>('users', KEY); }

/** Find or create the account for an email (sign-in and checkout both use this). */
export async function ensureUser(email: string, init: Partial<User> = {}): Promise<User> {
  const e = normEmail(email);
  const found = await userByEmail(e);
  const admin = adminEmails().includes(e);
  if (found) {
    const roles = admin && !found.roles.includes('admin') ? [...found.roles, 'admin' as Role] : found.roles;
    return saveUser({ ...found, ...pick(init), roles, paidUntil: Math.max(found.paidUntil, init.paidUntil ?? 0) });
  }
  const now = new Date().toISOString();
  return saveUser({
    id: newId('u'), email: e, name: init.name ?? null, roles: admin ? ['registered', 'admin'] : ['registered'], status: 'active',
    createdAt: now, updatedAt: now, lastLogin: null, customer: init.customer ?? null, paidUntil: init.paidUntil ?? 0,
    saved: [], searches: [], prefs: { newEvents: true, reminders: true },
  });
}
const pick = (o: Partial<User>) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && v !== null && ['name', 'customer', 'lastLogin'].includes(k)));

/** The signed-in account, or null (signed out, suspended, or accounts not switched on). */
export async function sessionUser(): Promise<User | null> {
  if (!storeReady()) return null;
  const jar = await cookies();
  const tok = verify(jar.get(SESSION)?.value, 'session');
  if (!tok) return null;
  const u = await getUser(tok.c).catch(() => null);
  return u && u.status === 'active' ? u : null;
}

export function sessionCookie(userId: string) {
  const e = Math.floor(Date.now() / 1000) + 90 * 86400;
  return { name: SESSION, value: sign({ c: userId, e, t: 'session' }), options: { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', expires: new Date(e * 1000) } };
}
export const loginToken = (email: string) => sign({ c: normEmail(email), e: Math.floor(Date.now() / 1000) + 30 * 60, t: 'login' });
export const isMember = (u: User | null) => Boolean(u && u.customer && u.paidUntil + 3 * 86400 > Date.now() / 1000);
