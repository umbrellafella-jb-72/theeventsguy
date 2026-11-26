import Link from 'next/link';
import { verify } from '@/lib/access';
import { safePath } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirm sign-in — The Events Guy', robots: { index: false } };

// Sign-in links land here first. Email security scanners (Outlook Safe Links, Mimecast and others)
// open every link in an email to check it; if the link signed you in straight away, the scanner
// would use up the one-time link before you clicked it. A button press can't be done by a scanner.
export default async function ConfirmSignIn({ searchParams }: { searchParams: Promise<{ token?: string; next?: string; news?: string }> }) {
  const sp = await searchParams;
  const ok = Boolean(verify(sp.token, 'login'));
  return (
    <div className="wrap section" style={{ maxWidth: 560 }}>
      <h1 className="page-title">{ok ? 'Sign in to The Events Guy' : 'That link has expired'}</h1>
      {ok ? (
        <form action="/api/login/verify" method="post" className="pform">
          <input type="hidden" name="token" value={sp.token} />
          <input type="hidden" name="next" value={safePath(sp.next)} />
          {sp.news === '1' && <input type="hidden" name="news" value="1" />}
          <p className="muted">One more click to finish signing in on this device.</p>
          <button className="btn btn-primary" type="submit" autoFocus>Sign in</button>
        </form>
      ) : <p className="muted">Sign-in links work for 30 minutes. <Link href="/login">Request a fresh one</Link>.</p>}
    </div>
  );
}
