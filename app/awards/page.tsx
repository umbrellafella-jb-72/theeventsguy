import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { KnotRule } from '@/components/Art';
import AwardsGuide from '@/components/AwardsGuide';
import type { AwardView } from '@/components/AwardCard';
import { getAccess } from '@/lib/access';
import { RELEASE_DAYS, awards, currentMonthKey, fullFor, judgesFor, monthLabel, taxonomy, todayKey } from '@/lib/data';
import { entryInfo, ENTRY_STEPS, JUDGE_TIPS } from '@/lib/awards';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Awards — The Events Guy' };

export default async function AwardsPage() {
  const access = await getAccess();
  const today = todayKey();
  const isPast = (a: { months: string[]; sortKey: string }) => a.months.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(a.sortKey) && a.sortKey < today;
  const all: AwardView[] = awards.filter(a => !isPast(a)).map(a => ({ ...a, entry: entryInfo(a.entryDeadline, today), judgeList: judgesFor(a) }));

  // Free visitors see this month's ceremonies (and featured awards). Members see, in full, every
  // award whose entry deadline or ceremony is in the next RELEASE_DAYS days; the rest are released
  // as they come into range, so the whole year can't be copied out at once.
  const preview = currentMonthKey();
  const visible = all.filter(a => fullFor(a, access.paid));

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
        <Link className="btn btn-primary" href="/awards/finder">What awards should we enter?</Link>
        <a className="btn btn-secondary" href="#how-to-enter">How to enter</a>
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

        {access.paid && soonest.filter(a => fullFor(a, true)).length > 0 && (
          <section className="section aw-soon">
            <div className="section-head"><h2>Deadlines coming up</h2></div>
            <div className="aw-soon-grid">
              {soonest.filter(a => fullFor(a, true)).map(a => (
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
            <h2>{access.paid ? `Awards in the next ${RELEASE_DAYS} days` : `Ceremonies in ${monthLabel(preview)}`}</h2>
            <span className="muted">{access.paid ? `Deadline or ceremony within ${RELEASE_DAYS} days — more are released every day` : `Free preview — subscribers see each award ${RELEASE_DAYS} days ahead`}</span>
          </div>
          <AwardsGuide awards={visible} areas={areas} topics={topics} />
          {access.paid ? (
            all.length > visible.length && <p className="note" style={{ marginTop: 24 }}>{all.length - visible.length} more awards are released to you as their entry deadline or ceremony comes within {RELEASE_DAYS} days. Each one’s name and date is in <Link href="/guide">the guide</Link>.</p>
          ) : (
            <div className="lock-panel" style={{ marginTop: 24 }}>
              <h2>{all.length - visible.length} more awards</h2>
              <p>{open.length} have an entry deadline ahead and {closing30} close in the next 30 days. Members see each award’s deadlines, judges, fees and entry links {RELEASE_DAYS} days ahead.</p>
              {access.paymentsReady
                ? <Link className="btn btn-primary" href="/#pricing">See membership plans</Link>
                : <p className="note">Payments aren’t switched on yet for this deployment.</p>}
            </div>
          )}
        </section>

        <section className="finder-cta" aria-labelledby="finder-cta-title">
          <div>
            <span className="label">Awards finder</span>
            <h2 id="finder-cta-title">What awards should we enter?</h2>
            <p>Five quick questions about what you’ve done, where you want to win and when you could be ready. Get a shortlist that fits — and help with the entries if you want it.</p>
          </div>
          <Link className="btn btn-primary" href="/awards/finder">Take the quiz</Link>
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
