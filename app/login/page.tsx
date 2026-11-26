import { cookies } from 'next/headers';
import Link from 'next/link';
import { formCopy } from '@/lib/forms';
import { publicEmail } from '@/lib/alerts';
import { safePath, storeReady } from '@/lib/store';
import { PENDING, pendingEmail } from '@/lib/signin';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return { title: (await searchParams).mode === 'join' ? 'Create a free account — The Events Guy' : 'Sign in — The Events Guy' };
}
export const dynamic = 'force-dynamic';

const CODE_ERRORS: Record<string, string> = {
  bad: 'That code isn’t right. Check the email and try again.',
  expired: 'That code has expired. Request a fresh one below.',
  locked: 'Too many wrong codes. Request a fresh one below.',
  slow: 'Too many attempts. Please wait a few minutes and try again.',
};

/** Shows a masked address (j•••@gainratio.co.uk) so people can see which inbox to check. */
const mask = (e: string) => { const [u, d] = e.split('@'); return `${u.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(5, u.length - 1)))}@${d}`; };

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; expired?: string; bad?: string; off?: string; suspended?: string; next?: string; slow?: string; used?: string; failed?: string; mode?: string; code?: string; left?: string }> }) {
  const sp = await searchParams;
  const join = sp.mode === 'join';
  const optin = await formCopy('optin');
  const waiting = pendingEmail((await cookies()).get(PENDING)?.value);
  const switchTo = (m: 'join' | 'signin') => `/login?${new URLSearchParams({ ...(m === 'join' ? { mode: 'join' } : {}), ...(sp.next ? { next: sp.next } : {}) })}`;

  return (
    <div className="wrap">
      <div className="form-card">
        {!storeReady() || sp.off ? (
          <>
            <h1>Sign in</h1>
            <p className="note">Accounts aren’t switched on for this site yet. Members can still use the guide on the device they subscribed on.</p>
          </>
        ) : sp.suspended ? (
          <>
            <h1>Sign in</h1>
            <p className="note">This account has been suspended. Contact us if you think that’s a mistake.</p>
          </>
        ) : sp.sent && waiting ? (
          <>
            <h1>Check your email</h1>
            <p>We’ve sent a 6-digit code and a sign-in button to <b>{mask(waiting)}</b>.</p>
            {sp.code && CODE_ERRORS[sp.code] && <p className="note" role="alert" id="code-error">{CODE_ERRORS[sp.code]}{sp.code === 'bad' && sp.left ? ` ${sp.left} ${sp.left === '1' ? 'try' : 'tries'} left.` : ''}</p>}
            <form action="/api/login/code" method="post" className="code-form">
              <label htmlFor="code">Enter the code from the email</label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
                placeholder="123 456" aria-invalid={sp.code ? true : undefined} aria-describedby={sp.code ? 'code-error' : 'code-hint'} />
              <button className="btn btn-primary" type="submit">{join ? 'Create my account' : 'Sign in'}</button>
            </form>
            <p className="muted small" id="code-hint">Reading the email on another device, like your phone? Type the code here. Or press the button in the email to sign in on that device instead. Both work once, for 30 minutes.</p>
            <p className="muted small">No email? Check spam, or <Link href={switchTo(join ? 'join' : 'signin')}>try again with a different address</Link>.</p>
          </>
        ) : (
          <>
            <h1>{join ? 'Create your free account' : 'Sign in'}</h1>
            <p className="muted">{join
              ? 'Save events to your shortlist, keep saved searches, and list yourself as a speaker, sponsor or organiser. No password: we email you a code.'
              : 'No password: we email you a 6-digit code and a sign-in button. If you’re new, this creates your free account.'}</p>
            {sp.sent && <p className="note">That sign-in has timed out on this device. Request a fresh code below.</p>}
            {sp.expired && <p className="note">That link or code has expired. Request a fresh one below.</p>}
            {sp.bad && <p className="note" id="email-error" role="alert">That doesn’t look like an email address.</p>}
            {sp.used && <p className="note">That link has already been used. Each sign-in link works once. Request a fresh one below.</p>}
            {sp.slow && <p className="note">Too many sign-in requests. Please wait a few minutes and try again.</p>}
            {sp.failed && <p className="note" role="alert">We couldn’t send your sign-in email just now. Please try again in a minute. If it keeps happening, email {publicEmail()}.</p>}
            <form action="/api/login" method="post" className="login-form">
              <input type="hidden" name="next" value={safePath(sp.next)} />
              <input type="hidden" name="mode" value={join ? 'join' : 'signin'} />
              {join && <><label htmlFor="name">Your name (optional)</label><input id="name" name="name" autoComplete="name" maxLength={80} /></>}
              <label htmlFor="email">{join ? 'Email' : 'Your email'}</label>
              <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.co.uk" aria-invalid={sp.bad ? true : undefined} aria-describedby={sp.bad ? 'email-error' : undefined} />
              <button className="btn btn-primary" type="submit">{join ? 'Create free account' : 'Email me a code'}</button>
              <label className="optin login-optin"><input type="checkbox" name="marketing" value="yes" /> <span>{optin.signin}</span></label>
            </form>
            <p className="login-switch">{join
              ? <>Already have an account? <Link href={switchTo('signin')}>Sign in</Link></>
              : <>New here? <Link href={switchTo('join')}>Create a free account</Link></>}</p>
          </>
        )}
        <p className="muted" style={{ fontSize: 14, marginBottom: 0 }}>Want every event in full? <Link href="/#pricing">See membership</Link>.</p>
      </div>
    </div>
  );
}
