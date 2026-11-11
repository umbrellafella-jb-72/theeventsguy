import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { GuyPortrait } from '@/components/Art';
import { AwardsQuiz } from '@/components/AwardsQuiz';
import { getAccess } from '@/lib/access';
import { sessionUser } from '@/lib/users';
import { eventHref, fullFor } from '@/lib/data';
import { entryInfo } from '@/lib/awards';
import { matchAwards } from '@/lib/award-match';
import { labelFor, readAnswers, summary } from '@/lib/award-quiz';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'What awards should we enter? — The Events Guy', description: 'Answer five questions and get a shortlist of ecommerce awards that fit — then get help choosing and writing your entries.' };

export default async function AwardFinder({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const a = readAnswers(sp);
  const access = await getAccess();
  // Visitors who haven't registered get the count, not the names (they only see this month elsewhere).
  const canSee = access.paid || Boolean(await sessionUser());
  const here = `/awards/finder?${new URLSearchParams(Object.entries(sp).filter(([k]) => k !== 'sent').map(([k, v]) => [k, String(v)]))}`;
  const matches = a ? matchAwards(a) : [];
  const today = new Date().toISOString().slice(0, 10);
  const sent = sp.sent === '1';

  return (
    <>
      <PageHero eyebrow="Awards finder" scene="chimneys" title="What awards should we enter?"
        intro="Five quick questions. We’ll match you to the ecommerce awards that fit what you’ve done, where you want to win and when you could be ready — then help with the entries if you want it." />
      <div className="wrap section finder">
        {!a ? (
          <AwardsQuiz />
        ) : (
          <>
            <section id="results" aria-labelledby="results-title">
              <div className="section-head">
                <h2 id="results-title">{matches.length ? `Your shortlist: ${matches.length} award${matches.length === 1 ? '' : 's'}` : 'Nothing’s a close match yet'}</h2>
                <Link className="btn btn-ghost btn-sm" href="/awards/finder">Start again</Link>
              </div>
              <p className="muted finder-answers">{labelFor('who', a.who)} · {a.goals.map(g => labelFor('goals', g)).join(', ')} · {a.where.map(w => labelFor('where', w)).join(', ')} · {labelFor('sector', a.sector)} · ready {labelFor('when', a.when).toLowerCase()}</p>
              {matches.length > 0 && !canSee ? (
                <div className="lock-panel">
                  <h3>We found {matches.length} award{matches.length === 1 ? '' : 's'} that fit you</h3>
                  <p>Create a free account to see your shortlist: which awards, when the ceremonies are and why each one fits.</p>
                  <div className="lock-actions"><Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`${here}#results`)}`}>Register free to see them</Link></div>
                </div>
              ) : matches.length > 0 ? (
                <ol className="finder-list">
                  {matches.map((m, i) => {
                    const full = fullFor(m.e, access.paid);
                    const entry = entryInfo(m.e.entryDeadline, today) as { label: string };
                    return (
                      <li key={m.e.id} className="finder-item">
                        <span className="finder-rank">{i + 1}</span>
                        <div>
                          <h3><Link href={eventHref(m.e)}>{m.e.name}</Link></h3>
                          <p className="muted">Ceremony {m.e.dates} · {m.e.city}{m.e.organiser ? ` · ${m.e.organiser}` : ''}</p>
                          <p className="finder-why"><b>Why it fits:</b> {m.reasons.join(' · ') || 'Broad categories that suit you'}</p>
                          {full
                            ? <p className="finder-entry">{entry.label}{m.e.entryUrl ? <> · <a href={m.e.entryUrl} target="_blank" rel="noopener noreferrer">How to enter</a></> : null}</p>
                            : <p className="finder-entry muted">{m.entryOpen ? 'Entries open' : 'Entry dates to come'} — {access.paid ? 'deadline, fees and judges are released 30 days ahead' : <>members see the deadline, fees and judges. <Link href="/#pricing">Join</Link></>}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p>Try widening where you want to win, or what you’d like recognised. Or tell us below and we’ll suggest some by hand.</p>
              )}
            </section>

            <section id="enquire" className="finder-enquire" aria-labelledby="enq-title">
              <GuyPortrait size={120} className="finder-guy" />
              {sent ? (
                <div><h2 id="enq-title">Thanks — we have your answers</h2><p className="muted">We’ll come back by email, usually within a couple of working days, with the awards we’d go for and how to make the entries count.</p></div>
              ) : (
                <form action="/api/enquire" method="post" className="enquiry">
                  <div className="hp" aria-hidden="true"><label>Leave this empty<input name="company_url" tabIndex={-1} autoComplete="off" /></label></div>
                  <h2 id="enq-title">Want a hand with the entries?</h2>
                  <p className="muted">Send us your answers and we’ll tell you which of these to prioritise, what the judges look for and how to write an entry that gets shortlisted.</p>
                  <input type="hidden" name="from" value="awards" />
                  <input type="hidden" name="interest" value="Awards entry advice" />
                  <input type="hidden" name="quiz" value={summary(a)} />
                  {canSee && <input type="hidden" name="shortlist" value={matches.map(m => m.e.name).join('; ')} />}
                  <input type="hidden" name="back" value={here} />
                  <div className="field-row">
                    <label>Name<input name="name" required autoComplete="name" /></label>
                    <label>Work email<input name="email" type="email" required autoComplete="email" /></label>
                  </div>
                  <label>Company<input name="company" autoComplete="organization" /></label>
                  <label>Anything we should know?<textarea name="message" rows={3} placeholder="The campaign or result you’re proudest of, budget for entry fees, deadlines you’re working to…" /></label>
                  <button className="btn btn-primary" type="submit">Send my answers</button>
                </form>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
