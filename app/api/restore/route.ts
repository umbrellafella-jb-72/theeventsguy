import { NextResponse } from 'next/server';
// Old sign-in form posts now go to the one login (307 keeps the POST body).
export async function POST(req: Request) { return NextResponse.redirect(new URL('/api/login', req.url), 307); }
