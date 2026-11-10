import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { allOpps, oppFor } from '@/lib/portal';
import { sessionUser } from '@/lib/users';
import { storeReady } from '@/lib/store';
import { can } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sponsorship opportunities — The Events Guy', description: 'Sponsorship opportunities at UK and European ecommerce events, posted by the organisers.' };

export default async function Opportunities({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const viewer = await sessionUser();
  const q = (sp.q ?? '').toLowerCase().trim();
  const opps = storeReady() ? (await allOpps()).filter(o => o.status === 'published' && (!q || `${o.title} ${o.eventName ?? ''} ${o.city ?? ''} ${o.summary} ${o.sectors.join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.deadline ?? '9').localeCompare(b.deadline ?? '9')).map(o => oppFor(o, viewer)) : [];
  return (
    <>
      <PageHero eyebrow="Sponsorship" scene="containers" title="Sponsorship opportunities"
        intro="Organisers post what they’re offering sponsors: dinners, awards categories, stages and meetups across the UK, Ireland and Europe. Signed-in sponsors see budgets and how to get in touch.">
        {viewer && can(viewer, 'opportunity.post') ? <Link className="btn btn-primary" href="/portal/opportunities?edit=new">Post an opportunity</Link>
          : !viewer ? <Link className="btn btn-primary" href="/login?next=/opportunities">Sign in to see budgets</Link> : null}
      </PageHero>
      <div className="wrap section">
        <form className="dir-search" method="get"><input name="q" type="search" defaultValue={sp.q ?? ''} placeholder="Event, city, sector…" /><button className="btn btn-secondary btn-sm" type="submit">Search</button></form>
        {opps.length === 0 ? <div className="empty">No open opportunities yet. Organisers: <Link href="/account#roles">switch on the Organiser role</Link> to post one.</div> : (
          <div className="dir-grid">{opps.map(o => (
            <article key={o.id} className="dir-card">
              <h2><Link href={`/opportunities/${o.id}`}>{o.title}</Link></h2>
              <p className="muted">{[o.eventName, o.when, o.city].filter(Boolean).join(' · ')}</p>
              <p>{o.summary}</p>
              {o.sectors.length > 0 && <div className="ev-topics">{o.sectors.map(s => <span key={s} className="is-sector">{s}</span>)}</div>}
              <p className="muted">{o.locked ? 'Budget and contact: for signed-in sponsors and organisers.' : `Budget: ${o.budget ?? 'ask'}`}{o.deadline ? ` · Reply by ${o.deadline}` : ''}</p>
              <Link className="btn btn-secondary btn-sm" href={`/opportunities/${o.id}`}>Details</Link>
            </article>
          ))}</div>
        )}
      </div>
    </>
  );
}
