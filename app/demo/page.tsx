import { notFound } from 'next/navigation';
import { PERSONAS, demoEnabled, demoProblems, demoUsersExist, personaFor, sitePublic } from '@/lib/demo';
import { sessionUser } from '@/lib/users';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo accounts — The Events Guy', robots: { index: false } };

const DONE: Record<string, string> = { reset: 'Demo data reset to its starting state.', removed: 'Demo accounts and everything they created have been removed.' };

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
  const me = personaFor((await sessionUser())?.email);
  const seeded = await demoUsersExist();
  return (
    <div className="wrap section">
      <h1 className="page-title">Demo accounts</h1>
      <p className="muted">For testing before launch. Pick a persona to sign in as it; the gold bar at the top shows who you are and links back here. These accounts only work while the site is in preview — they switch off when it goes public.</p>
      {sp.done && DONE[sp.done] && <p className="note banner">{DONE[sp.done]}</p>}
      <div className="demo-grid">
        <section className={`demo-card${me ? '' : ' is-current'}`}>
          <h2>Visitor</h2><p className="muted">Not signed in.</p>
          <ul><li>Current month and featured events only</li><li>Speaker profiles and opportunity summaries</li><li>No budgets or contacts</li></ul>
          <form action="/api/demo" method="post"><input type="hidden" name="as" value="visitor" /><button className="btn btn-secondary btn-sm" type="submit">{me ? 'Sign out to visitor' : 'You are a visitor'}</button></form>
        </section>
        {PERSONAS.map(p => (
          <section key={p.key} className={`demo-card${me?.key === p.key ? ' is-current' : ''}`}>
            <h2>{p.label}</h2><p className="muted">{p.name} · {p.blurb}</p>
            <ul>{p.tryThis.map(t => <li key={t}>{t}</li>)}</ul>
            <form action="/api/demo" method="post"><input type="hidden" name="as" value={p.key} />
              <button className="btn btn-primary btn-sm" type="submit">{me?.key === p.key ? 'Signed in — open start page' : `Sign in as ${p.label}`}</button></form>
          </section>
        ))}
      </div>
      <h2>Demo data</h2>
      <p className="muted">Sample content: a published and a pending sponsorship opportunity, a sponsor profile, a speaker profile, an enquiry thread between the sponsor and organiser, one open report, and a starter shortlist. All of it is marked “demo”.</p>
      <div className="demo-tools">
        <form action="/api/demo" method="post"><input type="hidden" name="as" value="reset" /><button className="btn btn-secondary btn-sm" type="submit">{seeded ? 'Reset demo data' : 'Create demo data'}</button></form>
        {seeded && <details className="confirm"><summary className="btn btn-ghost btn-sm">Remove all demo data…</summary>
          <form action="/api/demo" method="post"><input type="hidden" name="as" value="remove" /><button className="btn btn-ghost btn-sm danger" type="submit">Yes, remove all demo data</button></form></details>}
      </div>
    </div>
  );
}
