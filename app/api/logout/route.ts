import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/access';
import { SESSION } from '@/lib/users';
import { siteUrl } from '@/lib/stripe';

export async function POST(req: Request) {
  const res = NextResponse.redirect(`${siteUrl(req)}/`, 303);
  res.cookies.delete(SESSION); res.cookies.delete(COOKIE);
  return res;
}
