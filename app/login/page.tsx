import Link from 'next/link';
import { safePath, storeReady } from '@/lib/store';

export const metadata = { title: 'Sign in — The Events Guy' };
export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; expired?: string; bad?: string; off?: string; suspended?: string; next?: string; slow?: string; used?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wrap">
      <div className="form-card">
        <h1>Sign in or create an account</h1>
        {!storeReady() || sp.off ? (
          <p className="note">Accounts aren’t switched on for this site yet. Members can still use the guide on the device they subscribed on.</p>
        ) : sp.sent ? (
          <p className="note">Check your email: a sign-in link is on its way. It works for 30 minutes.</p>
        ) : sp.suspended ? (
          <p className="note">This account has been suspended. Contact us if you think that’s a mistake.</p>
        ) : (
          <>
            <p className="muted">One login for everything: a free account for your shortlist, saved searches and speaker, sponsor or organiser profile, and your membership if you have one. No password — we email you a link.</p>
            {sp.expired && <p className="note">That link has expired — request a fresh one below.</p>}
            {sp.bad && <p className="note">That doesn’t look like an email address.</p>}
            {sp.used && <p className="note">That link has already been used. Each sign-in link works once — request a fresh one below.</p>}
            {sp.slow && <p className="note">Too many sign-in requests. Please wait a few minutes and try again.</p>}
            <form action="/api/login" method="post">
              <input type="hidden" name="next" value={safePath(sp.next)} />
              <label htmlFor="email" className="sr-only">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.co.uk" />
              <button className="btn btn-primary" type="submit">Email me a link</button>
              <label className="optin login-optin"><input type="checkbox" name="marketing" value="yes" /> <span>Also send me the monthly roundup of new events and awards. Unsubscribe any time.</span></label>
            </form>
          </>
        )}
        <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>Want every event in full? <Link href="/#pricing">See membership</Link>.</p>
      </div>
    </div>
  );
}
