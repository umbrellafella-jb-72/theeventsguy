import { NextResponse } from 'next/server';
import { verify } from '@/lib/access';
import { setMarketing } from '@/lib/marketing';
import { storeReady } from '@/lib/store';
import { siteUrl } from '@/lib/stripe';

// One-click unsubscribe from the monthly roundup (the link and List-Unsubscribe header in every roundup).
// Works without signing in; the link is signed for that one address.
async function off(req: Request) {
  const tok = verify(new URL(req.url).searchParams.get('token') ?? undefined, 'news');
  if (!tok || !storeReady()) return false;
  await setMarketing(tok.c, false, 'Unsubscribe link');
  return true;
}
export async function GET(req: Request) {
  return NextResponse.redirect(`${siteUrl(req)}/unsubscribed${(await off(req)) ? '' : '?invalid=1'}`, 303);
}
export async function POST(req: Request) { return new Response(null, { status: (await off(req)) ? 200 : 400 }); }
