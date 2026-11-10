// Accounts and portal data in Redis, over Upstash's REST API — no SDK.
// Add the Upstash Redis integration from the Vercel Marketplace and it sets KV_REST_API_URL and
// KV_REST_API_TOKEN (UPSTASH_REDIS_REST_URL / _TOKEN work too). Without it the guide still runs,
// but accounts, profiles, opportunities, enquiries and member emails are switched off.

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const storeReady = () => Boolean(url() && token());

export async function redis<T = unknown>(...cmd: (string | number)[]): Promise<T> {
  const res = await fetch(url(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Redis: ${json.error ?? res.status}`);
  return json.result as T;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis<string | null>('GET', key);
  return raw ? (JSON.parse(raw) as T) : null;
}
export async function setJSON(key: string, value: unknown): Promise<void> { await redis('SET', key, JSON.stringify(value)); }
export async function del(key: string): Promise<void> { await redis('DEL', key); }
export async function addTo(set: string, member: string): Promise<void> { await redis('SADD', set, member); }
export async function removeFrom(set: string, member: string): Promise<void> { await redis('SREM', set, member); }
export async function members(set: string): Promise<string[]> { return redis<string[]>('SMEMBERS', set); }

/** Every JSON doc whose id is in `set` (missing ones skipped). */
export async function allIn<T>(set: string, key: (id: string) => string): Promise<T[]> {
  const out: T[] = [];
  for (const id of await members(set)) { const d = await getJSON<T>(key(id)); if (d) out.push(d); }
  return out;
}

/** Set a key once (for "already sent" markers). True if this call set it. */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  return (await redis<string | null>('SET', key, '1', 'NX', 'EX', ttlSeconds)) === 'OK';
}
export async function getValue(key: string): Promise<string | null> { return redis<string | null>('GET', key); }
export async function setValue(key: string, value: string): Promise<void> { await redis('SET', key, value); }

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Count a hit against a rate limit. True when `key` has gone over `limit` within `windowSeconds`.
 *  Without the database (or if it errors) this lets the request through rather than lock people out. */
export async function tooMany(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!storeReady()) return false;
  try {
    const n = await redis<number>('INCR', `rl:${key}`);
    if (n === 1) await redis('EXPIRE', `rl:${key}`, windowSeconds);
    return n > limit;
  } catch { return false; }
}

/** The caller's IP as Vercel reports it (for rate limits only). */
export function clientIp(req: Request): string {
  return (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim();
}

/** A same-site path to send someone back to after sign-in; anything else becomes the fallback. */
export function safePath(p: string | null | undefined, fallback = '/account'): string {
  const s = String(p || '');
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : fallback;
}
