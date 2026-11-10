import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { KnotRule } from '@/components/Art';
import AwardsGuide from '@/components/AwardsGuide';
import type { AwardView } from '@/components/AwardCard';
import { getAccess } from '@/lib/access';
import { awards, judgesFor, monthLabel, taxonomy, todayKey } from '@/lib/data';
import { entryInfo, ENTRY_STEPS, JUDGE_TIPS } from '@/lib/awards';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Awards — The Events Guy' };

export default async function AwardsPage() {
  const access = await getAccess();
  const today = todayKey();
  const isPast = (a: { months: string[]; sortKey: string }) => a.months.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(a.sortKey) && a.sortKey < today;
  const all: AwardView[] = awards.filter(a => !isPast(a)).map(a => ({ ...a, entry: entryInfo(a.entryDeadline, today), judgeList: judgesFor(a) }));

  // Free visitors see one month of ceremonies: the next month that has any.
  const preview = all.map(a => a.months[0]).filter(Boolean).sort()[0] ?? null;
  const visible = access.paid ? all : all.filter(a => a.months[0] === preview);

  const open = all.filter(a => a.entry.state === 'open');
  const closing30 = open.filter(a => (a.entry.days ?? 99) <= 30).length;
  const withJudges = all.filter(a => a.judgeList.length).length;
  const in90 = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + 90)).toISOString().slice(0, 10);
  const soon90 = all.filter(a => a.sortKey >= today && a.sortKey <= in90).length;
  const soonest = [...open].sort((x, y) => (x.entry.next ?? '').localeCompare(y.entry.next ?? '')).slice(0, 4);
  const areas = taxonomy.areas.filter(v => all.some(a => a.area === v)).concat(all.some(a => a.area === 'Global & online') && !taxonomy.areas.includes('Global & online') ? ['Global & online'] : []);
  const topics = taxonomy.topics.filter(t => all.some(a => a.topics.includes(t)));

  return (
    <>
      <PageHero eyebrow="Awards" scene="chimneys" title="Ecommerce awards: deadlines, judges and how to enter"
        intro="Every ecommerce, retail and digital award worth entering across the UK, Ireland and Europe: when entries close, who’s judging, what it costs and how to write an entry that gets shortlisted.">
        <a className="btn btn-primary" href="#how-to-enter">How to enter</a>
      </PageHero>

      <div className="wrap">
        <section className="aw-stats" aria-label="Awards at a glance">
          <div><b>{all.length}</b><span>upcoming awards</span></div>
          <div><b>{open.length}</b><span>with a deadline ahead</span></div>
          <div><b>{closing30}</b><span>closing in 30 days</span></div>
          {withJudges > 0
            ? <div><b>{withJudges}</b><span>with judges named</span></div>
            : <div><b>{soon90}</b><span>ceremonies in the next 3 months</span></div>}
        </section>

        {access.paid && soonest.length > 0 && (
          <section className="section aw-soon">
            <div className="section-head"><h2>Deadlines coming up</h2></div>
            <div className="aw-soon-grid">
              {soonest.map(a => (
                <a key={a.id} className="aw-soon-tile" href={`#aw-${a.id}`}>
                  <span className="label">{a.entry.label}</span>
                  <strong>{a.name}</strong>
                  <span className="muted">Ceremony {a.dates.replace(/\s*20\d\d/g, '')} · {a.city}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <h2>{access.paid ? 'All awards' : `Ceremonies in ${preview ? monthLabel(preview) : 'the coming months'}`}</h2>
            {!access.paid && <span className="muted">Free preview — subscribers see all {all.length}</span>}
          </div>
          <AwardsGuide awards={visible} areas={areas} topics={topics} />
          {!access.paid && (
            <div className="lock-panel" style={{ marginTop: 24 }}>
              <h2>{all.length - visible.length} more awards</h2>
              <p>{open.length} have an entry deadline ahead and {closing30} close in the next 30 days. Subscribe to see every award with its deadlines, judges, fees and entry links.</p>
              {access.paymentsReady
                ? <form action="/api/checkout" method="post"><button className="btn btn-primary" type="submit">Subscribe</button></form>
                : <p className="note">Payments aren’t switched on yet for this deployment.</p>}
            </div>
          )}
        </section>

        <KnotRule id="hawser-awards" />

        <section className="section" id="how-to-enter">
          <h2 className="section-title">How to enter an award</h2>
          <p className="muted aw-lede">General advice from The Events Guy, not any one organiser’s rules. Every award has its own rules, so always read the organiser’s entry pack too.</p>
          <ol className="steps">{ENTRY_STEPS.map(s => <li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>)}</ol>
        </section>

        <section className="section aw-judging">
          <div>
            <h2 className="section-title">What judges look for</h2>
            <ul className="aw-tips">{JUDGE_TIPS.map(t => <li key={t.title}><b>{t.title}.</b> {t.body}</li>)}</ul>
          </div>
          <div className="aw-cta">
            <span className="badge badge-torc">Organisers & judges</span>
            <h3>Run an awards programme, or sit on a panel?</h3>
            <p>Send us your entry dates, categories and judging panel and we’ll keep your listing up to date. Judges get a profile on the Speakers page that links back to the award.</p>
            <Link className="btn btn-secondary btn-sm" href="/sponsors#enquire">Get your award listed</Link>
          </div>
        </section>
      </div>
    </>
  );
}
