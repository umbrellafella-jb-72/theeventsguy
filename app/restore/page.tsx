import Link from 'next/link';

export const metadata = { title: 'Sign in — EventGuy' };

export default async function Restore({ searchParams }: { searchParams: Promise<{ sent?: string; expired?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wrap">
      <div className="form-card">
        <h1>Sign in on this device</h1>
        {sp.sent ? (
          <p className="note">If that email has an active subscription, a sign-in link is on its way. It works for 30 minutes.</p>
        ) : (
          <>
            <p className="muted">Enter the email you subscribed with and we’ll send you a link.</p>
            {sp.expired && <p className="note">That link has expired — request a fresh one below.</p>}
            <form action="/api/restore" method="post">
              <label htmlFor="email" className="sr-only">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.co.uk" />
              <button className="btn btn-primary" type="submit">Email me a link</button>
            </form>
          </>
        )}
        <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>Not subscribed yet? <Link href="/#pricing">See pricing</Link>.</p>
      </div>
    </div>
  );
}
