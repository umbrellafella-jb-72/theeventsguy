import { EnquiryForm } from '@/components/EnquiryForm';
import { PageHero } from '@/components/PageHero';
import { KnotRule, Triskele } from '@/components/Art';
import { PLACEMENTS, SPONSORS, SPONSOR_RULES, SPONSOR_SLOTS } from '@/lib/offers';
import { events, media, monthSummaries } from '@/lib/data';
import Link from 'next/link';
import { allOpps, allSponsors } from '@/lib/portal';
import { storeReady } from '@/lib/store';

export const metadata = { title: 'Sponsors — The Events Guy' };

export const dynamic = 'force-dynamic';

export default async function Sponsors({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  // From the portal: open opportunities (summary only here) and published sponsor profiles (public fields only).
  const opps = storeReady() ? (await allOpps().catch(() => [])).filter(o => o.status === 'published').sort((a, b) => (a.deadline ?? '9').localeCompare(b.deadline ?? '9')).slice(0, 6) : [];
  const brands = storeReady() ? (await allSponsors().catch(() => [])).filter(p => p.status === 'published') : [];
  const busiest = monthSummaries().filter(s => s.key !== 'tbc').sort((a, b) => b.count - a.count)[0];
  const countries = new Set(events.filter(e => e.area === 'Europe' && e.region !== 'Location TBC').map(e => e.region)).size;
  return (
    <>
      <PageHero eyebrow="Sponsors" scene="containers" title="Be seen by the people who plan the ecommerce year"
        intro="Ecommerce leads, agencies and platforms use The Events Guy to decide where they will be each month. Sponsorship puts your brand in that moment: clearly labelled, never dressed up as editorial.">
        <a className="btn btn-primary" href="#enquire">Talk sponsorship</a>
      </PageHero>
      <div className="wrap">
        <section className="section">
          <div className="facts">
            <div><b>{events.length}</b><span>events and awards</span></div>
            <div><b>{countries + 2}</b><span>countries incl. UK & Ireland</span></div>
            <div><b>{busiest ? busiest.count : 0}</b><span>events in {busiest?.label ?? 'the busiest month'}</span></div>
            <div><b>{media.length}</b><span>podcasts & webinars</span></div>
          </div>
        </section>
        <section className="section">
          <h2 className="section-title">Ways to sponsor</h2>
          <div className="placement-grid">
            {PLACEMENTS.map(p => (
              <article key={p.id} className="placement">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <p className="where"><b>Appears on</b> {p.where}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="section">
          <div className="section-head"><h2 className="section-title" style={{ margin: 0 }}>Sponsorship opportunities</h2><Link className="btn btn-ghost btn-sm" href="/opportunities">All opportunities →</Link></div>
          {opps.length ? (
            <div className="dir-grid">{opps.map(o => (
              <article key={o.id} className="dir-card"><h3><Link href={`/opportunities/${o.id}`}>{o.title}</Link></h3><p className="muted">{[o.eventName, o.when, o.city].filter(Boolean).join(' · ')}</p><p>{o.summary}</p></article>
            ))}</div>
          ) : <p className="muted">Organisers post sponsorship opportunities here. <Link href="/login?next=/portal/opportunities">Post yours</Link> — it’s free.</p>}
          <p className="muted" style={{ marginTop: 12 }}>Budgets and contact routes are shown to signed-in sponsors and organisers. <Link href="/login?next=/portal/sponsor">Create a free sponsor profile</Link>.</p>
        </section>
        {brands.length > 0 && (
          <section className="section">
            <h2 className="section-title">Brands looking to sponsor</h2>
            <div className="dir-grid">{brands.map(b => (
              <article key={b.userId} className="dir-card"><h3>{b.company}</h3><p>{b.about}</p>{b.interests.length > 0 && <p className="muted"><b>Wants to sponsor:</b> {b.interests.join(', ')}</p>}
                <div className="ev-topics">{b.sectors.map(x => <span key={x} className="is-sector">{x}</span>)}</div></article>
            ))}</div>
          </section>
        )}
        <section className="section">
          <h2 className="section-title">Our sponsors</h2>
          <div className="slots">
            {SPONSORS.map(x => {
              const logo = <img src={x.logo} alt={x.name} loading="lazy" />;
              return x.url
                ? <a key={x.name} className="slot slot-sponsor" style={x.plate ? { background: x.plate } : undefined} href={x.url} target="_blank" rel="noopener noreferrer sponsored">{logo}</a>
                : <div key={x.name} className="slot slot-sponsor" style={x.plate ? { background: x.plate } : undefined}>{logo}</div>;
            })}
            {Array.from({ length: Math.max(0, SPONSOR_SLOTS - SPONSORS.length) }, (_, i) => (
              <div key={`open-${i}`} className="slot"><Triskele size={28} tone="ink-muted" ring={false} /><span>Founding sponsor slot open</span></div>
            ))}
          </div>
          <p className="muted">{SPONSORS.length
            ? `Thank you to our founding sponsor${SPONSORS.length === 1 ? '' : 's'}. ${SPONSOR_SLOTS - SPONSORS.length > 0 ? 'Founding slots for 2027 are still open, with first pick of months and topics.' : ''}`
            : 'No sponsors yet. Founding sponsors for 2027 get first pick of months and topics.'}</p>
        </section>
        <section className="section">
          <h2 className="section-title">The rules we keep</h2>
          <ul className="ticks">{SPONSOR_RULES.map(r => <li key={r}>{r}</li>)}</ul>
        </section>
        <KnotRule id="hawser-sponsors" />
        <section id="enquire"><EnquiryForm from="sponsors" interest="Sponsoring The Events Guy" sent={!!sp.sent} /></section>
      </div>
    </>
  );
}
