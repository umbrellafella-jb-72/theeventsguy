import { NextResponse } from 'next/server';
import { saveUser, sessionUser } from '@/lib/users';
import { siteUrl } from '@/lib/stripe';

// Email settings and display name from the account page.
export async function POST(req: Request) {
  const f = await req.formData();
  const u = await sessionUser();
  if (!u) return NextResponse.redirect(`${siteUrl(req)}/login`, 303);
  const name = String(f.get('name') ?? u.name ?? '').trim().slice(0, 80) || null;
  await saveUser({ ...u, name, prefs: { newEvents: f.get('newEvents') === 'on', reminders: f.get('reminders') === 'on' } });
  return NextResponse.redirect(`${siteUrl(req)}/account?saved=1`, 303);
}
