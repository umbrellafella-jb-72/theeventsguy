// Speaker photos, kept on our side (Redis) so they don't break when LinkedIn's image links expire.
// Each is cropped to a 400px square JPEG (~30 KB). Shown publicly only once a profile records that
// the speaker agreed (photoConsent) — until then only the speaker and admins can see it.
import sharp from 'sharp';
import { redis } from './store';

const KEY = (id: string) => `spkimg:${id}`;
export const photoPath = (id: string, v: number | string = Date.now()) => `/api/speaker-photo/${encodeURIComponent(id)}?v=${v}`;
export const isStoredPhoto = (img: string | null | undefined, id: string) => !!img && img.startsWith(`/api/speaker-photo/${encodeURIComponent(id)}`);

/** Resize and store. Returns false if it isn't an image we can read. */
export async function storePhoto(id: string, bytes: Buffer | Uint8Array): Promise<boolean> {
  try {
    const out = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize(400, 400, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    await redis('SET', KEY(id), out.toString('base64'));
    return true;
  } catch { return false; }
}
export async function getPhoto(id: string): Promise<Buffer | null> {
  const b64 = await redis<string | null>('GET', KEY(id)).catch(() => null);
  return b64 ? Buffer.from(b64, 'base64') : null;
}
export async function hasPhoto(id: string) { return Boolean(await redis<number>('EXISTS', KEY(id)).catch(() => 0)); }
export async function deletePhoto(id: string) { await redis('DEL', KEY(id)).catch(() => null); }

/** Download a LinkedIn profile photo (media.licdn.com only) and store it. */
export async function storePhotoFromUrl(id: string, url: string): Promise<boolean> {
  if (!/^https:\/\/media\.licdn\.com\//i.test(url)) return false;
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) return false;
    const len = Number(res.headers.get('content-length') || 0);
    if (len > 5_000_000) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5_000_000) return false;
    return storePhoto(id, buf);
  } catch { return false; }
}
