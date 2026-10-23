import { EnquiryForm } from '@/components/EnquiryForm';
import { PageHero } from '@/components/PageHero';
import { KnotRule, Triskele } from '@/components/Art';
import { PLACEMENTS, SPONSOR_RULES } from '@/lib/offers';
import { events, media, monthSummaries } from '@/lib/data';

export const metadata = { title: 'Sponsors — The Events Guy' };

export default async function Sponsors({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
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
          <h2 className="section-title">Our sponsors</h2>
          <div className="slots">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="slot"><Triskele size={28} tone="ink-muted" ring={false} /><span>Founding sponsor slot open</span></div>
            ))}
          </div>
          <p className="muted">No sponsors yet. Founding sponsors for 2027 get first pick of months and topics.</p>
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
