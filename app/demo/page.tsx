import { notFound } from 'next/navigation';
import { PERSONAS, demoEnabled, demoProblems, demoUsersExist, personaFor, sitePublic } from '@/lib/demo';
import { sessionUser } from '@/lib/users';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo accounts — The Events Guy', robots: { index: false } };

const DONE: Record<string, string> = { out: 'Signed out. You’re now seeing the site as a visitor.', reset: 'Demo data reset to its starting state.', removed: 'Demo accounts and everything they created have been removed.' };

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  if (sitePublic()) notFound();
  if (!demoEnabled()) return (
    <div className="wrap section">
      <h1 className="page-title">Demo accounts are switched off</h1>
      <ul>{demoProblems().map(p => <li key={p}>{p}</li>)}</ul>
      <p className="muted">Environment: {process.env.VERCEL_ENV ?? 'local'}{process.env.VERCEL_GIT_COMMIT_SHA ? ` · build ${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)}` : ''}</p>
    </div>
  );
  const sp = await searchParams;
  const user = await sessionUser();
  const me = personaFor(user?.email);
  const real = Boolean(user && !me);
  const seeded = await demoUsersExist();
  const label = (k: string) => PERSONAS.find(p => p.key === k)?.label ?? k;
  const action = (key: string) => (me?.key === key ? 'Open start page' : user ? `Switch to ${label(key)}` : `Sign in as ${label(key)}`);
  const signOut = (cls = 'btn btn-secondary btn-sm') => (
    <form action="/api/demo" method="post"><input type="hidden" name="as" value="visitor" /><button className={cls} type="submit">Sign out</button></form>
  );
  return (
    <div className="wrap section">
      <h1 className="page-title">Demo accounts</h1>
      {sp.done && DONE[sp.done] && <p className="note banner">{DONE[sp.done]}</p>}
      <section className="demo-now" aria-live="polite">
        <span className="label">Right now</span>
        {me ? <p>You’re signed in as <b>{me.label}</b> ({me.name}).</p>
          : real ? <p>You’re signed in with <b>your own account</b>, not a demo one.</p>
          : <p>You’re <b>not signed in</b>, so you’re seeing the site as a visitor.</p>}
        <div className="demo-now-actions">
          {me && <form action="/api/demo" method="post"><input type="hidden" name="as" value={me.key} /><button className="btn btn-primary btn-sm" type="submit">Open {me.label} start page</button></form>}
          {user && signOut()}
        </div>
      </section>
      <p className="muted">Pick any account below. It switches straight over: there’s no need to sign out first, and there are no passwords. While you’re in a demo account, the gold bar at the top of every page shows which one, with links to switch or sign out. These accounts only work while the site is in preview.</p>
      <div className="demo-grid">
        <section className={`demo-card${!user ? ' is-current' : ''}`}>
          <div className="demo-card-head"><h2>Visitor</h2>{!user && <span className="badge badge-glen">You</span>}</div>
          <p className="muted">Not signed in.</p>
          <ul><li>Current month and featured events only</li><li>Speaker profiles and opportunity summaries</li><li>No budgets or contacts</li></ul>
          {user ? signOut('btn btn-primary btn-sm') : <p className="muted demo-here">This is you now.</p>}
        </section>
        {PERSONAS.map(p => (
          <section key={p.key} className={`demo-card${me?.key === p.key ? ' is-current' : ''}`}>
            <div className="demo-card-head"><h2>{p.label}</h2>{me?.key === p.key && <span className="badge badge-glen">You</span>}</div>
            <p className="muted">{p.name} · {p.blurb}</p>
            <ul>{p.tryThis.map(t => <li key={t}>{t}</li>)}</ul>
            <form action="/api/demo" method="post"><input type="hidden" name="as" value={p.key} />
              <button className={`btn btn-sm ${me?.key === p.key ? 'btn-secondary' : 'btn-primary'}`} type="submit">{action(p.key)}</button></form>
          </section>
        ))}
      </div>
      <h2>Demo data</h2>
      <p className="muted">Sample content: a published and a pending sponsorship opportunity, a sponsor profile, a speaker profile, an enquiry thread between the sponsor and organiser, one open report, 8 sample leads across the Services, Sponsors and Awards finder forms (with a few roundup sign-ups), and a starter shortlist. All of it is marked “demo”.</p>
      <div className="demo-tools">
        <form action="/api/demo" method="post"><input type="hidden" name="as" value="reset" /><button className="btn btn-secondary btn-sm" type="submit">{seeded ? 'Reset demo data' : 'Create demo data'}</button></form>
        {seeded && <details className="confirm"><summary className="btn btn-ghost btn-sm">Remove all demo data…</summary>
          <form action="/api/demo" method="post"><input type="hidden" name="as" value="remove" /><button className="btn btn-ghost btn-sm danger" type="submit">Yes, remove all demo data</button></form></details>}
      </div>
    </div>
  );
}
