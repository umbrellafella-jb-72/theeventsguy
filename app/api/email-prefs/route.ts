import { NextResponse } from 'next/server';
import { verify } from '@/lib/access';
import { storeReady } from '@/lib/store';
import { getUser, saveUser } from '@/lib/users';
import { siteUrl } from '@/lib/stripe';

// One-click unsubscribe from the link in every email (works without signing in).
// ?off=newEvents | reminders | all. POST is the mail client's one-click (List-Unsubscribe-Post).
async function turnOff(req: Request) {
  const q = new URL(req.url).searchParams;
  const tok = verify(q.get('token') ?? undefined, 'prefs');
  const off = q.get('off') || 'all';
  if (!tok || !storeReady()) return false;
  const u = await getUser(tok.c);
  if (!u) return false;
  await saveUser({ ...u, prefs: { newEvents: off === 'reminders' ? u.prefs.newEvents : false, reminders: off === 'newEvents' ? u.prefs.reminders : false } });
  return true;
}
export async function GET(req: Request) {
  const ok = await turnOff(req);
  return NextResponse.redirect(`${siteUrl(req)}/account?${ok ? 'unsubscribed=1' : 'link=invalid'}`, 303);
}
export async function POST(req: Request) { return new Response(null, { status: (await turnOff(req)) ? 200 : 400 }); }
