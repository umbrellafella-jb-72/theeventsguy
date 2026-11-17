import { getPhoto } from '@/lib/photos';
import { getSpeaker } from '@/lib/portal';
import { sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';
import { storeReady } from '@/lib/store';

// A speaker's stored photo. Public once their profile is live with the photo agreed; before that,
// only the speaker and admins can see it (so an admin can check it before publishing).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent((await params).id);
  if (!storeReady() || !/^[A-Za-z0-9_-]{3,80}$/.test(id)) return new Response('Not found', { status: 404 });
  const p = await getSpeaker(id);
  const isPublic = Boolean(p && p.status === 'published' && p.photoConsent);
  if (!isPublic) {
    const u = await sessionUser();
    if (!u || (u.id !== id && !can(u, 'content.moderate'))) return new Response('Not found', { status: 404 });
  }
  const img = await getPhoto(id);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(img), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': isPublic ? 'public, max-age=86400' : 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
