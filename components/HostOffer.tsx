import { GuyPortrait } from '@/components/Art';
import { HOST_FAQ, HOST_INTERESTS, HOST_STEPS, HOST_TIERS } from '@/lib/offers';

/** "List your event": the organiser offer, Free vs Partner, with its own short form. */
export function HostOffer({ listed, counts }: { listed?: boolean; counts: { events: number; awards: number } }) {
  const Mark = ({ on }: { on: boolean }) => on
    ? <span className="tier-yes" aria-label="Included">✓</span>
    : <span className="tier-no">Not included</span>;
  return (
    <section className="host" id="list-event" aria-labelledby="host-title">
      <div className="host-intro">
        <div>
          <div className="eyebrow">For event organisers</div>
          <h2 id="host-title">List your event with The Events Guy</h2>
          <p>Get your conference, dinner, meetup or awards in front of the ecommerce people planning their year. Every approved event is listed free. Partners get featured to subscribers before tickets sell out.</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#host-form">List your event</a>
            <a className="btn btn-secondary" href="#host-tiers">Free vs Partner</a>
          </div>
          <p className="host-proof"><b>{counts.events}</b> events and <b>{counts.awards}</b> awards already in the guide, across the UK, Ireland and Europe.</p>
        </div>
        <figure className="host-guy">
          <GuyPortrait size={200} />
          <figcaption>“Send it over. If ecommerce people should be there, it goes in the guide.”</figcaption>
        </figure>
      </div>

      <h3 className="host-h">How we fill your room</h3>
      <ol className="host-steps">
        {HOST_STEPS.map(s => (
          <li key={s.title}>
            <div className="host-step-top">
              <span className="label">{s.when}</span>
              {s.partner && <span className="badge badge-torc">Partner only</span>}
            </div>
            <h4>{s.title}</h4>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>

      <h3 className="host-h" id="host-tiers">Free vs Partner</h3>
      <div className="tier-wrap">
        <table className="tiers">
          <thead>
            <tr><th scope="col"><span className="sr-only">Feature</span></th>
              <th scope="col"><span className="tier-name">Free</span><span className="tier-price">£0, every approved event</span></th>
              <th scope="col" className="is-partner"><span className="tier-name">Partner</span><span className="tier-price">Quoted per event</span></th></tr>
          </thead>
          <tbody>
            {HOST_TIERS.map(r => (
              <tr key={r.feature}><th scope="row">{r.feature}</th><td><Mark on={r.free} /></td><td className="is-partner"><Mark on={r.partner} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="host-bottom">
        <div>
          <h3 className="host-h">Questions</h3>
          <div className="faq">{HOST_FAQ.map((f, i) => <details key={f.q} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div>
        {listed ? (
          <div className="enquiry" id="host-form"><h2>Thanks — your event is with us</h2><p className="muted">We review every event and reply by email, usually within a couple of working days.</p></div>
        ) : (
          <form className="enquiry" id="host-form" action="/api/enquire" method="post">
            <h2>List my event</h2>
            <input type="hidden" name="from" value="services" />
            <input type="hidden" name="kind" value="host" />
            <div className="field-row">
              <label htmlFor="h-name">Name<input id="h-name" name="name" required autoComplete="name" /></label>
              <label htmlFor="h-email">Work email<input id="h-email" name="email" type="email" required autoComplete="email" /></label>
            </div>
            <div className="field-row">
              <label htmlFor="h-event">Event name<input id="h-event" name="event" required /></label>
              <label htmlFor="h-link">Event link<input id="h-link" name="link" type="url" required placeholder="https://" /></label>
            </div>
            <fieldset className="tier-pick">
              <legend>Interested in</legend>
              {HOST_INTERESTS.map((t, i) => <label key={t}><input type="radio" name="interest" value={t} defaultChecked={i === 0} required /> {t}</label>)}
            </fieldset>
            <label htmlFor="h-msg">Anything else (optional)<textarea id="h-msg" name="message" rows={3} /></label>
            <button className="btn btn-primary" type="submit">Submit my event</button>
          </form>
        )}
      </div>
    </section>
  );
}
