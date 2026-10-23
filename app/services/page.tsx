import { EnquiryForm } from '@/components/EnquiryForm';
import { PageHero } from '@/components/PageHero';
import { PortScene, KnotRule } from '@/components/Art';
import { SERVICES, STEPS } from '@/lib/offers';

export const metadata = { title: 'Services — The Events Guy' };

export default async function Services({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHero eyebrow="Services" scene="crane" title="Get more from the events calendar"
        intro="The guide tells you what's on. If you want help deciding where to spend your team's time and budget, or getting your own event in front of the right people, start here.">
        <a className="btn btn-primary" href="#enquire">Make an enquiry</a>
      </PageHero>
      <div className="wrap">
        <section className="section">
          <div className="offer-grid">
            {SERVICES.map(s => (
              <article key={s.id} className="offer">
                <PortScene scene={s.scene} className="offer-art" align="xMaxYMax" />
                <div className="offer-body">
                  <span className="badge">{s.who}</span>
                  <h2>{s.title}</h2>
                  <p>{s.body}</p>
                  <ul className="ticks">{s.points.map(p => <li key={p}>{p}</li>)}</ul>
                  <a className="btn btn-secondary btn-sm" href="#enquire">Ask about this</a>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="section">
          <h2 className="section-title">How it works</h2>
          <ol className="steps">{STEPS.map(s => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol>
        </section>
        <KnotRule id="hawser-services" />
        <section id="enquire"><EnquiryForm from="services" sent={!!sp.sent} /></section>
      </div>
    </>
  );
}
