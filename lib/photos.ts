// Speaker photos, kept on our side (Redis) so they don't break when LinkedIn's image links expire.
// Each is cropped to a 400px square JPEG (~30 KB). Shown publicly only once a profile records that
// the speaker agreed (photoConsent) — until then only the speaker and admins can see it.
import sharp from 'sharp';
import { redis } from './store';

const KEY = (id: string) => `spkimg:${id}`;          // what's shown (styled or not)
const ORIG = (id: string) => `spkimg-orig:${id}`;    // the cropped original, to restyle later
export type PhotoStyle = 'guy' | 'photo';

// The Events Guy treatment: the photo as a harbour-to-gold duotone, with a little extra contrast, so
// every card sits in the brand palette alongside the cartoon placeholders.
const STOPS: [number, [number, number, number]][] = [
  [0, [0x17, 0x26, 0x2b]],    // harbour
  [0.45, [0x7a, 0x5a, 0x2a]], // bronze
  [0.75, [0xc9, 0x99, 0x2e]], // torc gold
  [1, [0xf6, 0xe2, 0xae]],    // pale gold
];
function shade(t: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i], [p0, c0] = STOPS[i - 1];
    if (t <= p1) { const k = (t - p0) / (p1 - p0 || 1); return [0, 1, 2].map(j => Math.round(c0[j] + (c1[j] - c0[j]) * k)) as [number, number, number]; }
  }
  return STOPS[STOPS.length - 1][1];
}
const LUT = Array.from({ length: 256 }, (_, v) => shade(v / 255));
async function guyStyle(jpeg: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(jpeg).greyscale().normalise().linear(1.15, -12).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) { const c = LUT[data[i]]; out[i * 3] = c[0]; out[i * 3 + 1] = c[1]; out[i * 3 + 2] = c[2]; }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
}
async function publish(id: string, orig: Buffer, style: PhotoStyle) {
  const shown = style === 'guy' ? await guyStyle(orig) : orig;
  await redis('SET', KEY(id), shown.toString('base64'));
}
/** Re-render the shown photo in a different style from the stored original. */
export async function restylePhoto(id: string, style: PhotoStyle): Promise<boolean> {
  const b64 = await redis<string | null>('GET', ORIG(id)).catch(() => null);
  if (!b64) return false;
  await publish(id, Buffer.from(b64, 'base64'), style); return true;
}
export const photoPath = (id: string, v: number | string = Date.now()) => `/api/speaker-photo/${encodeURIComponent(id)}?v=${v}`;
export const isStoredPhoto = (img: string | null | undefined, id: string) => !!img && img.startsWith(`/api/speaker-photo/${encodeURIComponent(id)}`);

/** Resize and store. Returns false if it isn't an image we can read. */
export async function storePhoto(id: string, bytes: Buffer | Uint8Array, style: PhotoStyle = 'guy'): Promise<boolean> {
  try {
    const orig = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize(400, 400, { fit: 'cover', position: 'attention' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    await redis('SET', ORIG(id), orig.toString('base64'));
    await publish(id, orig, style);
    return true;
  } catch { return false; }
}
export async function getPhoto(id: string): Promise<Buffer | null> {
  const b64 = await redis<string | null>('GET', KEY(id)).catch(() => null);
  return b64 ? Buffer.from(b64, 'base64') : null;
}
export async function hasPhoto(id: string) { return Boolean(await redis<number>('EXISTS', KEY(id)).catch(() => 0)); }
export async function deletePhoto(id: string) { await redis('DEL', KEY(id), ORIG(id)).catch(() => null); }

/** Download a LinkedIn profile photo (media.licdn.com only) and store it. */
export async function storePhotoFromUrl(id: string, url: string, style: PhotoStyle = 'guy'): Promise<boolean> {
  if (!/^https:\/\/media\.licdn\.com\//i.test(url)) return false;
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!res.ok || !/^image\//i.test(res.headers.get('content-type') || '')) return false;
    const len = Number(res.headers.get('content-length') || 0);
    if (len > 5_000_000) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 5_000_000) return false;
    return storePhoto(id, buf, style);
  } catch { return false; }
}
