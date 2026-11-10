import { NextResponse } from 'next/server';
import { getAccess } from '@/lib/access';
import { eventById } from '@/lib/data';
import { saveUser, sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';

// Saved events. Any signed-in account can save (a free account is enough); the list follows them
// to every device. Without accounts switched on, members keep theirs in the browser ("local").
export async function GET() {
  const u = await sessionUser();
  if (u && can(u, 'shortlist.save')) return NextResponse.json({ mode: 'server', saved: u.saved });
  if ((await getAccess()).paid) return NextResponse.json({ mode: 'local', saved: [] });
  return NextResponse.json({ error: 'sign-in' }, { status: 401 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || ''), save = Boolean(body.saved);
  if (!eventById.has(id)) return NextResponse.json({ error: 'unknown-event' }, { status: 400 });
  const u = await sessionUser();
  if (u && can(u, 'shortlist.save')) {
    const saved = save ? [...new Set([...u.saved, id])] : u.saved.filter(x => x !== id);
    await saveUser({ ...u, saved });
    return NextResponse.json({ mode: 'server', saved });
  }
  if ((await getAccess()).paid) return NextResponse.json({ mode: 'local' });
  return NextResponse.json({ error: 'sign-in' }, { status: 401 });
}
