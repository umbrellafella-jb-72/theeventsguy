// Best-effort read of a public LinkedIn profile: the same public preview a chat app shows when a
// profile link is pasted (page title, description and photo, plus any schema.org Person data).
// LinkedIn often refuses automated requests, so callers must treat every field as optional and let
// an admin fill in or correct the rest. Nothing here signs in to LinkedIn or follows other links.

export type LinkedInPreview = {
  ok: boolean;            // got a profile page back with something useful on it
  reason?: string;        // why not, in plain words, when !ok
  name?: string; headline?: string; company?: string; location?: string; about?: string;
  photo?: string;         // https://media.licdn.com/… (profile photos only, never LinkedIn's default image)
};

/** https://www.linkedin.com/in/<handle>/ for any personal profile link, else null. */
export function normaliseLinkedIn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`); } catch { return null; }
  if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/in\/([A-Za-z0-9_%.-]{2,100})\/?/);
  return m ? `https://www.linkedin.com/in/${m[1]}/` : null;
}

const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

function meta(html: string, key: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  const v = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return v ? decode(v) : undefined;
}

const isPhoto = (u: string | undefined) => !!u && /^https:\/\/media\.licdn\.com\/dms\/image\//i.test(u) && !/ghost|default/i.test(u);
const BOILER = /view .{0,80}profile on linkedin|join linkedin|sign in|linkedin is the world/i;

/** Pull what we can out of a profile page's HTML. Exported for tests. */
export function parseLinkedInHtml(html: string): LinkedInPreview {
  const out: LinkedInPreview = { ok: false };
  // schema.org Person, when LinkedIn includes it.
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      const nodes: Record<string, unknown>[] = Array.isArray(j) ? j : Array.isArray(j?.['@graph']) ? j['@graph'] : [j];
      const p = nodes.find(n => n && n['@type'] === 'Person') as Record<string, any> | undefined;
      if (!p) continue;
      if (typeof p.name === 'string') out.name = decode(p.name);
      const job = Array.isArray(p.jobTitle) ? p.jobTitle[0] : p.jobTitle;
      if (typeof job === 'string') out.headline = decode(job);
      const works = Array.isArray(p.worksFor) ? p.worksFor[0] : p.worksFor;
      if (works?.name) out.company = decode(String(works.name));
      const loc = p.address?.addressLocality;
      if (typeof loc === 'string') out.location = decode(loc);
      if (typeof p.description === 'string' && !BOILER.test(p.description)) out.about = decode(p.description).slice(0, 1200);
      const img = typeof p.image === 'string' ? p.image : p.image?.contentUrl;
      if (isPhoto(img)) out.photo = img;
    } catch { /* not JSON we understand */ }
  }
  // Open Graph / Twitter preview tags: "Name - Headline - Company | LinkedIn".
  const title = meta(html, 'og:title') ?? meta(html, 'twitter:title') ?? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  if (title && !/^(linkedin|sign in|sign up|log in|join|security verification)\b/i.test(title)) {
    const parts = title.replace(/\s*\|\s*LinkedIn\s*$/i, '').split(/\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    if (parts[0] && !out.name) out.name = parts[0];
    if (parts.length >= 3) { out.headline ??= parts[1]; out.company ??= parts.slice(2).join(' – '); }
    else if (parts.length === 2) { out.headline ??= parts[1]; }
  }
  const desc = meta(html, 'og:description') ?? meta(html, 'description');
  if (desc) {
    const exp = desc.match(/Experience:\s*([^·|]+)/i)?.[1]?.trim();
    if (exp && !out.company) out.company = exp;
    const loc = desc.match(/Location:\s*([^·|]+)/i)?.[1]?.trim();
    if (loc && !out.location) out.location = loc;
    if (!out.about && !/Experience:|Education:|connections on LinkedIn/i.test(desc) && !BOILER.test(desc)) out.about = desc.slice(0, 1200);
  }
  const img = meta(html, 'og:image') ?? meta(html, 'twitter:image');
  if (!out.photo && isPhoto(img)) out.photo = img;
  out.ok = Boolean(out.name);
  if (!out.ok) out.reason = 'LinkedIn didn’t share the profile';
  return out;
}

/** Fetch a profile's public preview. Never throws. */
export async function fetchLinkedIn(url: string): Promise<LinkedInPreview> {
  const clean = normaliseLinkedIn(url);
  if (!clean) return { ok: false, reason: 'That isn’t a LinkedIn profile link (it should look like linkedin.com/in/name)' };
  try {
    const res = await fetch(clean, {
      redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TheEventsGuy-LinkPreview/1.0; +https://theeventsguy.co.uk)',
        Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-GB,en;q=0.9',
      },
    });
    if (!res.ok) return { ok: false, reason: res.status === 999 || res.status === 429 ? 'LinkedIn refused the request (it limits automated lookups)' : `LinkedIn answered ${res.status}` };
    if (!/(^|\.)linkedin\.com$/i.test(new URL(res.url).hostname) || /\/authwall|\/login|\/signup/i.test(res.url)) return { ok: false, reason: 'LinkedIn asked for a sign-in instead of showing the profile' };
    const html = (await res.text()).slice(0, 2_000_000);
    return parseLinkedInHtml(html);
  } catch (e) {
    return { ok: false, reason: (e as Error)?.name === 'TimeoutError' ? 'LinkedIn took too long to answer' : 'Couldn’t reach LinkedIn' };
  }
}
